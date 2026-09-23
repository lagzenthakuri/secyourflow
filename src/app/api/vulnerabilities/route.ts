import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma, Severity, VulnSource, VulnStatus, WorkflowState } from "@prisma/client";
import { logActivity } from "@/lib/logger";
import { requireSessionWithOrg, ROLE_VULNERABILITY_WRITE } from "@/lib/api-auth";
import { enqueue } from "@/lib/queue";
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

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Capped: `limit` was parsed straight from the query string, so ?limit=999999
  // was honoured and a non-numeric value produced `take: NaN`, which throws.
  limit: z.coerce.number().int().min(1).max(200).default(20),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]).optional(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "MITIGATED", "FIXED", "ACCEPTED", "FALSE_POSITIVE"])
    .optional(),
  workflowState: z.enum(["NEW", "TRIAGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  source: z
    .enum([
      "NESSUS", "OPENVAS", "NMAP", "TRIVY", "QUALYS", "RAPID7",
      "CROWDSTRIKE", "MANUAL", "API", "OTHER", "TENABLE",
    ])
    .optional(),
  search: z.string().max(300).optional(),
  exploited: z.enum(["true", "false"]).optional(),
  kev: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const parsedQuery = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsedQuery.error.flatten() },
      { status: 400 },
    );
  }

  const query = parsedQuery.data;
  const { organizationId } = authResult.context;
  const { page, limit } = query;

  const where: Prisma.VulnerabilityWhereInput = { organizationId };

  if (query.severity) where.severity = query.severity;
  if (query.status) where.status = query.status;
  if (query.workflowState) where.workflowState = query.workflowState;
  if (query.source) where.source = query.source;
  if (query.exploited === "true") where.isExploited = true;
  if (query.kev === "true") where.cisaKev = true;

  const search = query.search?.trim();
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
    // One round trip for everything. The EPSS histogram used to run as a second
    // Promise.all after this one resolved, so a page render cost two sequential
    // batches rather than one.
    const [
      vulns,
      total,
      severityDistribution,
      sourceDistribution,
      exploitedCount,
      epssHigh,
      epssMedium,
      epssLow,
      epssMinimal,
      epssUnknown,
    ] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          assignedUser: { select: { id: true, name: true, email: true } },
          _count: { select: { assets: true } },
          // The edit modal needs the current link to pre-populate its asset
          // selector; without it an existing link looked unset.
          assets: { take: 1, select: { assetId: true } },
          riskEntries: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      prisma.vulnerability.count({ where }),
      // Aggregates honour the active filters. They were org-wide while the
      // EPSS panel beside them was filtered, so the same screen disagreed
      // with itself.
      prisma.vulnerability.groupBy({ by: ["severity"], where, _count: { _all: true } }),
      prisma.vulnerability.groupBy({ by: ["source"], where, _count: { _all: true } }),
      prisma.vulnerability.count({ where: { ...where, isExploited: true } }),
      prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0.7 } } }),
      prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0.3, lte: 0.7 } } }),
      prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0.1, lte: 0.3 } } }),
      prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0, lte: 0.1 } } }),
      // Comparison operators exclude NULL, so unscored findings vanished from
      // the histogram entirely and the buckets never summed to the total.
      prisma.vulnerability.count({ where: { ...where, epssScore: null } }),
    ]);

    const formattedVulns = vulns.map((v) => ({
      ...v,
      affectedAssets: v._count?.assets || 0,
      assetId: v.assets[0]?.assetId ?? null,
    }));

    return NextResponse.json({
      data: formattedVulns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        severityDistribution: severityDistribution.map((entry) => ({
          severity: entry.severity,
          count: entry._count._all,
        })),
        sourceDistribution: sourceDistribution.map((entry) => ({
          source: entry.source,
          count: entry._count._all,
        })),
        exploitedCount,
        epssDistribution: {
          high: epssHigh,
          medium: epssMedium,
          low: epssLow,
          minimal: epssMinimal,
          unknown: epssUnknown,
        },
      },
    });
  } catch (error) {
    console.error("Vulnerabilities API Error:", error);
    return NextResponse.json({ error: "Failed to fetch vulnerabilities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request, {
    allowedRoles: ROLE_VULNERABILITY_WRITE,
  });
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
  const assignedUserId =
    typeof payload.assignedUserId === "string" && payload.assignedUserId.trim().length > 0
      ? payload.assignedUserId.trim()
      : undefined;
  const assetId =
    typeof payload.assetId === "string" && payload.assetId.trim().length > 0 ? payload.assetId.trim() : undefined;

  try {
    if (assignedUserId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: assignedUserId,
          organizationId,
        },
        select: { id: true },
      });

      if (!assignee) {
        return NextResponse.json({ error: "assignedUserId is invalid for your organization" }, { status: 400 });
      }
    }

    if (assetId) {
      const targetAsset = await prisma.asset.findFirst({
        where: {
          id: assetId,
          organizationId,
        },
        select: { id: true },
      });

      if (!targetAsset) {
        return NextResponse.json({ error: "assetId is invalid for your organization" }, { status: 400 });
      }
    }

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
        assignedUserId,
        assignedTeam: payload.assignedTeam || undefined,
        slaDueAt: payload.slaDueAt ? new Date(payload.slaDueAt) : calculateSlaDueAt(severity),
        solution: payload.solution,
        isExploited: payload.isExploited || false,
        cisaKev: payload.cisaKev || false,
        organizationId,
        firstDetected: new Date(),
        lastSeen: new Date(),
        assets: assetId
          ? {
            create: {
              assetId,
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

    if (assetId) {
      // Queued, not fired-and-forgotten. The previous floating promise was
      // abandoned as soon as this response returned, which is what left risk
      // entries stuck in PROCESSING forever.
      await enqueue(
        "risk.assess",
        { organizationId, vulnerabilityId: newVuln.id, assetId, userId },
        {
          organizationId,
          entityType: "Vulnerability",
          entityId: newVuln.id,
          dedupeKey: `risk.assess:${organizationId}:${assetId}:${newVuln.id}`,
        },
      );
    }

    return NextResponse.json(newVuln, { status: 201 });
  } catch (error) {
    console.error("Create Vulnerability Error:", error);
    return NextResponse.json({ error: "Failed to create vulnerability" }, { status: 400 });
  }
}
