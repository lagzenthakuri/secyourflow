import { prisma } from "@/lib/prisma";
import type { Prisma, RemediationPlanStatus } from "@prisma/client";

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
  const { vulnerabilityIds = [], ...data } = input;

  return prisma.remediationPlan.create({
    data: {
      ...data,
      vulnerabilities: vulnerabilityIds.length
        ? {
            createMany: {
              data: vulnerabilityIds.map((vulnerabilityId) => ({
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
  data: Prisma.RemediationPlanUpdateInput,
) {
  const existing = await prisma.remediationPlan.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Remediation plan not found");
  }

  return prisma.remediationPlan.update({
    where: { id },
    data,
  });
}

export async function deleteRemediationPlan(id: string, organizationId: string) {
  const existing = await prisma.remediationPlan.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Remediation plan not found");
  }

  return prisma.remediationPlan.delete({
    where: { id },
  });
}

export async function syncPlanVulnerabilities(
  id: string,
  organizationId: string,
  vulnerabilityIds: string[],
) {
  await prisma.remediationPlanVulnerability.deleteMany({
    where: {
      planId: id,
      plan: { organizationId },
    },
  });

  if (vulnerabilityIds.length === 0) {
    return;
  }

  await prisma.remediationPlanVulnerability.createMany({
    data: vulnerabilityIds.map((vulnerabilityId) => ({
      planId: id,
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
  return prisma.remediationEvidence.create({
    data: params,
  });
}

export function calculatePlanProgress(progressValues: number[]) {
  if (progressValues.length === 0) return 0;

  const sum = progressValues.reduce((acc, value) => acc + value, 0);
  return Math.round(sum / progressValues.length);
}
