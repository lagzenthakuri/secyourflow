import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Severity, VulnSource, VulnStatus, WorkflowState } from "@prisma/client";
import { logActivity } from "@/lib/logger";
import { processRiskAssessment } from "@/lib/risk-engine";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { calculateSlaDueAt } from "@/lib/workflow/sla";
import { dispatchVulnerabilityNotifications } from "@/lib/notifications/rules";
import { extractRequestContext } from "@/lib/request-utils";
import { createNotification } from "@/lib/notifications/service";

const createVulnerabilitySchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]).optional(),
  cveId: z.string().optional(),
  cvssScore: z.number().optional().nullable(),
  cvssVector: z.string().optional().nullable(),
  source: z
    .enum([
      "NESSUS",
      "OPENVAS",
      "NMAP",
      "TRIVY",
      "QUALYS",
      "RAPID7",
      "CROWDSTRIKE",
      "MANUAL",
      "API",
      "OTHER",
      "TENABLE",
    ])
    .optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "MITIGATED", "FIXED", "ACCEPTED", "FALSE_POSITIVE"]).optional(),
  workflowState: z.enum(["NEW", "TRIAGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  assignedUserId: z.string().optional().nullable(),
  assignedTeam: z.string().max(120).optional().nullable(),
  slaDueAt: z.string().datetime().optional().nullable(),
  solution: z.string().optional(),
  isExploited: z.boolean().optional(),
  cisaKev: z.boolean().optional(),
  assetId: z.string().optional(),
});

function mapStatusToWorkflow(status: VulnStatus): WorkflowState {
  if (status === "OPEN") return "NEW";
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  if (status === "MITIGATED" || status === "FIXED") return "RESOLVED";
  if (status === "ACCEPTED" || status === "FALSE_POSITIVE") return "CLOSED";
  return "NEW";
}

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const searchParams = request.nextUrl.searchParams;
  const severity = searchParams.get("severity");
  const status = searchParams.get("status");
  const workflowState = searchParams.get("workflowState");
  const isExploited = searchParams.get("exploited");
  const cisaKev = searchParams.get("kev");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const where: Record<string, unknown> = { organizationId: authResult.context.organizationId };

  if (severity) where.severity = severity as Severity;
  if (status) where.status = status as VulnStatus;
  if (workflowState) where.workflowState = workflowState as WorkflowState;
  if (isExploited === "true") where.isExploited = true;
  if (cisaKev === "true") where.cisaKev = true;
  if (source) where.source = source as VulnSource;

  if (search) {
    where.OR = [
      { id: search },
      { title: { contains: search, mode: "insensitive" } },
      { cveId: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { assignedTeam: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [vulns, total, severityDistribution, sourceDistribution, exploitedCount] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          assignedUser: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { assets: true },
          },
          riskEntries: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.vulnerability.count({ where }),
      prisma.vulnerability.groupBy({
        by: ["severity"],
        where: { organizationId: authResult.context.organizationId },
        _count: { _all: true },
      }),
      prisma.vulnerability.groupBy({
        by: ["source"],
        where: { organizationId: authResult.context.organizationId },
        _count: { _all: true },
      }),
      prisma.vulnerability.count({
        where: {
          organizationId: authResult.context.organizationId,
          isExploited: true,
        },
      }),
    ]);

    const formattedVulns = vulns.map((v) => ({
      ...v,
      affectedAssets: v._count?.assets || 0,
    }));

    const severityDist = severityDistribution.map((s) => ({
      severity: s.severity,
      count: s._count._all,
    }));

    const sourceDist = sourceDistribution.map((s) => ({
      source: s.source,
      count: s._count._all,
    }));

    const epssDistribution = await Promise.all([
      prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0.7 } } }),
      prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0.3, lte: 0.7 } } }),
      prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0.1, lte: 0.3 } } }),
      prisma.vulnerability.count({ where: { ...where, epssScore: { lte: 0.1 } } }),
    ]);

    return NextResponse.json({
      data: formattedVulns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        severityDistribution: severityDist,
        sourceDistribution: sourceDist,
        exploitedCount,
        epssDistribution: {
          high: epssDistribution[0],
          medium: epssDistribution[1],
          low: epssDistribution[2],
          minimal: epssDistribution[3],
        },
      },
    });
  } catch (error) {
    console.error("Vulnerabilities API Error:", error);
    return NextResponse.json({ error: "Failed to fetch vulnerabilities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const ctx = extractRequestContext(request);

  const parsed = createVulnerabilitySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const { organizationId, userId } = authResult.context;

  const status = (payload.status || "OPEN") as VulnStatus;
  const severity = (payload.severity || "MEDIUM") as Severity;
  const workflowState = (payload.workflowState || mapStatusToWorkflow(status)) as WorkflowState;

  try {
    const newVuln = await prisma.vulnerability.create({
      data: {
        title: payload.title,
        description: payload.description,
        severity,
        cveId: payload.cveId,
        cvssScore: payload.cvssScore ?? undefined,
        cvssVector: payload.cvssVector ?? undefined,
        source: (payload.source || "MANUAL") as VulnSource,
        status,
        workflowState,
        assignedUserId: payload.assignedUserId || undefined,
        assignedTeam: payload.assignedTeam || undefined,
        slaDueAt: payload.slaDueAt ? new Date(payload.slaDueAt) : calculateSlaDueAt(severity),
        solution: payload.solution,
        isExploited: payload.isExploited || false,
        cisaKev: payload.cisaKev || false,
        organizationId,
        firstDetected: new Date(),
        lastSeen: new Date(),
        assets: payload.assetId
          ? {
            create: {
              assetId: payload.assetId,
              status: "OPEN",
            },
          }
          : undefined,
      },
    });

    await prisma.vulnerabilityWorkflowTransition.create({
      data: {
        vulnerabilityId: newVuln.id,
        organizationId,
        toState: workflowState,
        changedById: userId,
        note: "Initial workflow state",
      },
    });

    await logActivity(
      "VULNERABILITY_CREATED",
      "Vulnerability",
      newVuln.id,
      null,
      {
        title: newVuln.title,
        severity: newVuln.severity,
        workflowState: newVuln.workflowState,
        assignedUserId: newVuln.assignedUserId,
        assignedTeam: newVuln.assignedTeam,
      },
      `Vulnerability detected: ${newVuln.title}`,
      userId,
      ctx,
    );

    // If assigned on creation, notify the assignee
    if (newVuln.assignedUserId) {
      await createNotification({
        userId: newVuln.assignedUserId,
        title: "New Vulnerability Assigned",
        message: `A new vulnerability has been assigned to you: ${newVuln.title}`,
        type: "INFO",
        link: `/vulnerabilities?search=${newVuln.id}`
      });
    }

    try {
      await dispatchVulnerabilityNotifications({
        organizationId,
        eventType: "VULNERABILITY_CREATED",
        vulnerability: {
          id: newVuln.id,
          title: newVuln.title,
          severity: newVuln.severity,
          isExploited: newVuln.isExploited,
          cisaKev: newVuln.cisaKev,
        },
      });
    } catch (notifyError) {
      console.error("Rule-based notification dispatch failed", notifyError);
    }

    if (payload.assetId) {
      processRiskAssessment(newVuln.id, payload.assetId, organizationId, userId).catch((err) =>
        console.error("Background Risk Assessment Validation Failed", err),
      );
    }

    return NextResponse.json(newVuln, { status: 201 });
  } catch (error) {
    console.error("Create Vulnerability Error:", error);
    return NextResponse.json({ error: "Failed to create vulnerability" }, { status: 400 });
  }
}
