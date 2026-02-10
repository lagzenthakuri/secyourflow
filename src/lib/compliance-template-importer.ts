import { prisma } from "@/lib/prisma";
import {
  getComplianceTemplate,
  isComplianceTemplateId,
  type ComplianceTemplateId,
} from "@/lib/compliance-template-library";

interface ImportTemplateOptions {
  templateId: ComplianceTemplateId;
  organizationId: string;
  overwriteExisting?: boolean;
  frameworkName?: string;
  frameworkDescription?: string;
}

interface ImportTemplateResult {
  frameworkId: string;
  frameworkName: string;
  createdFramework: boolean;
  createdControls: number;
  updatedControls: number;
  skippedControls: number;
}

export function assertTemplateId(value: string): ComplianceTemplateId {
  if (!isComplianceTemplateId(value)) {
    throw new Error(`Unsupported template: ${value}`);
  }
  return value;
}

export async function importComplianceTemplate(
  options: ImportTemplateOptions,
): Promise<ImportTemplateResult> {
  const template = getComplianceTemplate(options.templateId);
  const overwriteExisting = options.overwriteExisting ?? false;
  const frameworkName = options.frameworkName?.trim() || `${template.name} ${template.version}`;

  const existingFramework = await prisma.complianceFramework.findFirst({
    where: {
      organizationId: options.organizationId,
      name: frameworkName,
    },
  });

  const framework =
    existingFramework ||
    (await prisma.complianceFramework.create({
      data: {
        name: frameworkName,
        version: template.version,
        description: options.frameworkDescription?.trim() || template.description,
        isActive: true,
        organizationId: options.organizationId,
      },
    }));

  const existingControls = await prisma.complianceControl.findMany({
    where: {
      frameworkId: framework.id,
      controlId: {
        in: template.controls.map((control) => control.controlId),
      },
    },
    select: {
      id: true,
      controlId: true,
    },
  });

  const existingMap = new Map(existingControls.map((control) => [control.controlId, control.id]));

  const controlsToCreate = template.controls.filter((control) => !existingMap.has(control.controlId));
  if (controlsToCreate.length > 0) {
    await prisma.complianceControl.createMany({
      data: controlsToCreate.map((control) => ({
        controlId: control.controlId,
        title: control.title,
        description: control.description,
        category: control.category,
        objective: control.objective,
        controlType: control.controlType,
        frequency: control.frequency,
        nistCsfFunction: control.nistCsfFunction,
        ownerRole: control.ownerRole,
        evidenceRequired: control.evidenceRequired,
        frameworkId: framework.id,
      })),
      skipDuplicates: true,
    });
  }

  let updatedControls = 0;
  if (overwriteExisting) {
    for (const control of template.controls) {
      if (!existingMap.has(control.controlId)) {
        continue;
      }

      await prisma.complianceControl.updateMany({
        where: {
          frameworkId: framework.id,
          controlId: control.controlId,
        },
        data: {
          title: control.title,
          description: control.description,
          category: control.category,
          objective: control.objective,
          controlType: control.controlType,
          frequency: control.frequency,
          nistCsfFunction: control.nistCsfFunction,
          ownerRole: control.ownerRole,
          evidenceRequired: control.evidenceRequired,
        },
      });
      updatedControls += 1;
    }
  }

  return {
    frameworkId: framework.id,
    frameworkName: framework.name,
    createdFramework: !existingFramework,
    createdControls: controlsToCreate.length,
    updatedControls,
    skippedControls: overwriteExisting ? 0 : existingControls.length,
  };
}
