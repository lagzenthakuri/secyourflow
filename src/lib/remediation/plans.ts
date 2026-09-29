import { prisma } from "@/lib/prisma";
import type { Prisma, RemediationPlanStatus } from "@prisma/client";

export class RemediationPlanError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RemediationPlanError";
    this.status = status;
  }
}

function dedupeIds(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

async function assertOwnerInOrganization(ownerId: string, organizationId: string) {
  const owner = await prisma.user.findFirst({
    where: { id: ownerId, organizationId },
    select: { id: true },
  });

  if (!owner) {
    throw new RemediationPlanError("ownerId is invalid for this organization", 400);
  }
}

async function assertVulnerabilitiesInOrganization(
  vulnerabilityIds: string[],
  organizationId: string,
) {
  if (vulnerabilityIds.length === 0) {
    return;
  }

  const found = await prisma.vulnerability.findMany({
    where: {
      id: { in: vulnerabilityIds },
      organizationId,
    },
    select: { id: true },
  });

  if (found.length !== vulnerabilityIds.length) {
    throw new RemediationPlanError("One or more vulnerabilityIds are invalid for this organization", 400);
  }
}

export interface CreateRemediationPlanInput {
  organizationId: string;
  ownerId?: string | null;
  name: string;
  description?: string;
  status?: RemediationPlanStatus;
  dueDate?: Date | null;
  vulnerabilityIds?: string[];
}

export async function createRemediationPlan(input: CreateRemediationPlanInput) {
  const { vulnerabilityIds = [], ownerId, ...data } = input;
  const normalizedVulnerabilityIds = dedupeIds(vulnerabilityIds);

  if (ownerId) {
    await assertOwnerInOrganization(ownerId, input.organizationId);
  }

  await assertVulnerabilitiesInOrganization(normalizedVulnerabilityIds, input.organizationId);

  return prisma.remediationPlan.create({
    data: {
      ...data,
      ownerId,
      vulnerabilities: normalizedVulnerabilityIds.length
        ? {
            createMany: {
              data: normalizedVulnerabilityIds.map((vulnerabilityId) => ({
                vulnerabilityId,
              })),
            },
          }
        : undefined,
    },
    include: {
      vulnerabilities: {
        include: {
          vulnerability: true,
        },
      },
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function getRemediationPlans(
  organizationId: string,
  where: Prisma.RemediationPlanWhereInput = {},
) {
  return prisma.remediationPlan.findMany({
    where: {
      organizationId,
      ...where,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      vulnerabilities: {
        include: {
          vulnerability: {
            select: {
              id: true,
              title: true,
              severity: true,
              workflowState: true,
              slaDueAt: true,
            },
          },
        },
      },
      tickets: true,
      _count: {
        select: {
          notes: true,
          evidence: true,
          vulnerabilities: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getRemediationPlanById(id: string, organizationId: string) {
  return prisma.remediationPlan.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      vulnerabilities: {
        include: {
          vulnerability: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      evidence: {
        orderBy: { createdAt: "desc" },
      },
      tickets: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

export async function updateRemediationPlan(
  id: string,
  organizationId: string,
  data: Prisma.RemediationPlanUncheckedUpdateInput,
) {
  const existing = await prisma.remediationPlan.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!existing) {
    throw new RemediationPlanError("Remediation plan not found", 404);
  }

  if (typeof data.ownerId === "string") {
    await assertOwnerInOrganization(data.ownerId, organizationId);
  }

  return prisma.remediationPlan.update({
    where: { id: existing.id },
    data,
  });
}

export async function deleteRemediationPlan(id: string, organizationId: string) {
  const existing = await prisma.remediationPlan.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!existing) {
    throw new RemediationPlanError("Remediation plan not found", 404);
  }

  return prisma.remediationPlan.delete({
    where: { id: existing.id },
  });
}

export async function syncPlanVulnerabilities(
  id: string,
  organizationId: string,
  vulnerabilityIds: string[],
) {
  const plan = await prisma.remediationPlan.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!plan) {
    throw new RemediationPlanError("Remediation plan not found", 404);
  }

  const normalizedVulnerabilityIds = dedupeIds(vulnerabilityIds);
  await assertVulnerabilitiesInOrganization(normalizedVulnerabilityIds, organizationId);

  await prisma.remediationPlanVulnerability.deleteMany({
    where: {
      planId: plan.id,
      plan: { organizationId },
    },
  });

  if (normalizedVulnerabilityIds.length === 0) {
    return;
  }

  await prisma.remediationPlanVulnerability.createMany({
    data: normalizedVulnerabilityIds.map((vulnerabilityId) => ({
      planId: plan.id,
      vulnerabilityId,
    })),
    skipDuplicates: true,
  });
}

export async function addRemediationNote(params: {
  organizationId: string;
  authorId?: string;
  planId?: string;
  vulnerabilityId?: string;
  content: string;
}) {
  return prisma.remediationNote.create({
    data: params,
    include: {
      author: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function addRemediationEvidence(params: {
  organizationId: string;
  uploadedById?: string;
  planId?: string;
  vulnerabilityId?: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  checksum?: string;
  notes?: string;
}) {
  if (params.uploadedById) {
    const uploader = await prisma.user.findFirst({
      where: {
        id: params.uploadedById,
        organizationId: params.organizationId,
      },
      select: { id: true },
    });

    if (!uploader) {
      throw new RemediationPlanError("uploadedById is invalid for this organization", 400);
    }
  }

  if (params.planId) {
    const plan = await prisma.remediationPlan.findFirst({
      where: {
        id: params.planId,
        organizationId: params.organizationId,
      },
      select: { id: true },
    });

    if (!plan) {
      throw new RemediationPlanError("Plan not found", 404);
    }
  }

  if (params.vulnerabilityId) {
    const vulnerability = await prisma.vulnerability.findFirst({
      where: {
        id: params.vulnerabilityId,
        organizationId: params.organizationId,
      },
      select: { id: true },
    });

    if (!vulnerability) {
      throw new RemediationPlanError("vulnerabilityId is invalid for this organization", 400);
    }

    if (params.planId) {
      const linked = await prisma.remediationPlanVulnerability.findFirst({
        where: {
          planId: params.planId,
          vulnerabilityId: params.vulnerabilityId,
          plan: {
            organizationId: params.organizationId,
          },
        },
        select: { id: true },
      });

      if (!linked) {
        throw new RemediationPlanError("vulnerabilityId is not linked to the selected plan", 400);
      }
    }
  }

  return prisma.remediationEvidence.create({
    data: params,
  });
}

export function calculatePlanProgress(progressValues: number[]) {
  if (progressValues.length === 0) return 0;

  const sum = progressValues.reduce((acc, value) => acc + value, 0);
  return Math.round(sum / progressValues.length);
}
