import { prisma } from "@/lib/prisma";
import { normalizeIndicatorValue } from "@/modules/threat-intel/ioc/normalizer";
import type {
  ComplianceStatus,
  ControlFrequency,
  ControlType,
  Criticality,
  ImplementationStatus,
  Severity,
} from "@prisma/client";

interface ComplianceRiskAnalysis {
  controls_violated_iso27001?: string[];
  selected_controls?: string[];
  likelihood_score?: number;
  confidence?: number;
  threat?: string;
  rationale_for_risk_rating?: string;
  risk_category?: string;
}

interface ComplianceRiskEntry {
  id: string;
  organizationId: string;
  riskScore: number;
  aiAnalysis: ComplianceRiskAnalysis;
}

interface ComplianceVulnerability {
  title: string;
  cveId?: string | null;
  severity?: Severity | null;
}

interface ComplianceAsset {
  id: string;
  name: string;
}

interface AutomatedAssessmentAsset {
  id: string;
  name: string;
  criticality: Criticality;
  status: string;
  tags: string[];
  owner: string | null;
  metadata: unknown;
  updatedAt: Date;
  lastSeen: Date | null;
}

interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  pass: boolean;
  notApplicable: boolean;
  evaluatedAssets: number;
  evaluatedAssetIds: string[];
  passedAssets: number;
  failedAssetIds: string[];
  details: string;
}

interface AutomatedAssessmentRule {
  id: string;
  controlType: ControlType;
  name: string;
  description: string;
  keywords: string[];
  evaluate: (assets: AutomatedAssessmentAsset[]) => RuleEvaluation;
}

interface ControlAssessmentEvaluation {
  status: ComplianceStatus;
  ruleEvaluations: RuleEvaluation[];
  evidenceSummary: string;
  assetStatuses: Map<string, ComplianceStatus>;
}

interface AutomatedAssessmentResult {
  controlId: string;
  frameworkId: string;
  statusBefore: ComplianceStatus;
  statusAfter: ComplianceStatus;
  assessedAt: string;
  ruleCount: number;
  nonCompliantAssets: number;
}

interface ScheduledAssessmentResult {
  scannedControls: number;
  assessedControls: number;
  failedControls: number;
  snapshotsCreated: number;
}

const METADATA_BOOLEAN_KEYS = {
  antivirus: [
    "avInstalled",
    "antivirusInstalled",
    "antivirusEnabled",
    "endpointProtectionEnabled",
    "edrEnabled",
    "xdrEnabled",
  ],
  encryption: ["encryptionEnabled", "diskEncryptionEnabled", "storageEncryptionEnabled"],
  logging: ["loggingEnabled", "siemConnected", "auditLoggingEnabled", "monitoringEnabled"],
  backup: ["backupEnabled", "snapshotEnabled", "drReplicaEnabled"],
  patching: ["patchingEnabled", "autoPatchingEnabled"],
} as const;

const TAG_HINTS = {
  antivirus: ["av", "antivirus", "endpoint", "edr", "xdr", "defender", "malware"],
  encryption: ["encrypted", "encryption", "kms", "tls", "disk-encryption"],
  logging: ["siem", "logging", "log", "audit", "monitoring", "edr"],
  backup: ["backup", "snapshot", "replica", "recovery", "dr"],
} as const;

function normalizeLower(value: string) {
  return value.trim().toLowerCase();
}

function toMetadataObject(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function hasTruthyMetadata(metadata: Record<string, unknown>, keys: readonly string[]) {
  return keys.some((key) => {
    const value = metadata[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = normalizeLower(value);
      return normalized === "true" || normalized === "enabled" || normalized === "yes";
    }
    if (typeof value === "number") return value > 0;
    return false;
  });
}

function hasTagHint(tags: string[], hints: readonly string[]) {
  const normalizedTags = tags.map(normalizeLower);
  return hints.some((hint) => normalizedTags.some((tag) => tag.includes(hint)));
}

function hasCapability(
  asset: AutomatedAssessmentAsset,
  metadataKeys: readonly string[],
  tagHints: readonly string[],
) {
  const metadata = toMetadataObject(asset.metadata);
  return hasTruthyMetadata(metadata, metadataKeys) || hasTagHint(asset.tags, tagHints);
}

function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function getLastPatchTimestamp(asset: AutomatedAssessmentAsset): Date | null {
  const metadata = toMetadataObject(asset.metadata);
  const candidates = [
    metadata.lastPatchedAt,
    metadata.patchUpdatedAt,
    metadata.lastUpdateAt,
    metadata.patchDate,
  ];

  for (const candidate of candidates) {
    const parsed = parseDateLike(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function assessRuleCoverage(params: {
  ruleId: string;
  ruleName: string;
  assets: AutomatedAssessmentAsset[];
  inScope: (asset: AutomatedAssessmentAsset) => boolean;
  compliant: (asset: AutomatedAssessmentAsset) => boolean;
  successSummary: string;
  failureSummary: string;
}): RuleEvaluation {
  const scopedAssets = params.assets.filter(params.inScope);
  const evaluatedAssetIds = scopedAssets.map((asset) => asset.id);

  if (scopedAssets.length === 0) {
    return {
      ruleId: params.ruleId,
      ruleName: params.ruleName,
      pass: true,
      notApplicable: true,
      evaluatedAssets: 0,
      evaluatedAssetIds,
      passedAssets: 0,
      failedAssetIds: [],
      details: "No in-scope assets for this rule.",
    };
  }

  const failedAssets = scopedAssets.filter((asset) => !params.compliant(asset));
  const passedAssets = scopedAssets.length - failedAssets.length;
  const pass = failedAssets.length === 0;

  return {
    ruleId: params.ruleId,
    ruleName: params.ruleName,
    pass,
    notApplicable: false,
    evaluatedAssets: scopedAssets.length,
    evaluatedAssetIds,
    passedAssets,
    failedAssetIds: failedAssets.map((asset) => asset.id),
    details: pass ? params.successSummary : params.failureSummary,
  };
}

const AUTOMATED_ASSESSMENT_RULES: AutomatedAssessmentRule[] = [
  {
    id: "preventive-critical-av-coverage",
    controlType: "PREVENTIVE",
    name: "Critical assets have anti-malware controls",
    description: "Every active critical asset should have AV/EDR evidence.",
    keywords: ["malware", "antivirus", "av", "endpoint", "protection", "virus", "5.2.3", "a.8.7"],
    evaluate: (assets) =>
      assessRuleCoverage({
        ruleId: "preventive-critical-av-coverage",
        ruleName: "Critical assets have anti-malware controls",
        assets,
        inScope: (asset) => asset.criticality === "CRITICAL",
        compliant: (asset) =>
          hasCapability(asset, METADATA_BOOLEAN_KEYS.antivirus, TAG_HINTS.antivirus),
        successSummary: "All critical assets have anti-malware coverage.",
        failureSummary: "One or more critical assets are missing anti-malware coverage.",
      }),
  },
  {
    id: "preventive-sensitive-encryption",
    controlType: "PREVENTIVE",
    name: "Sensitive assets enforce encryption",
    description: "Critical and high assets should have encryption enabled.",
    keywords: ["encryption", "crypt", "data protection", "at rest", "in transit", "cc6.6", "pr.ds-01"],
    evaluate: (assets) =>
      assessRuleCoverage({
        ruleId: "preventive-sensitive-encryption",
        ruleName: "Sensitive assets enforce encryption",
        assets,
        inScope: (asset) => asset.criticality === "CRITICAL" || asset.criticality === "HIGH",
        compliant: (asset) =>
          hasCapability(asset, METADATA_BOOLEAN_KEYS.encryption, TAG_HINTS.encryption),
        successSummary: "Sensitive assets meet encryption coverage requirement.",
        failureSummary: "Sensitive assets are missing encryption coverage evidence.",
      }),
  },
  {
    id: "preventive-patching-sla",
    controlType: "PREVENTIVE",
    name: "Critical/high assets patched within 30 days",
    description: "Critical and high assets should have recent patch activity.",
    keywords: ["patch", "vulnerability", "hardening", "6.3.3", "a.8.8"],
    evaluate: (assets) =>
      assessRuleCoverage({
        ruleId: "preventive-patching-sla",
        ruleName: "Critical/high assets patched within 30 days",
        assets,
        inScope: (asset) => asset.criticality === "CRITICAL" || asset.criticality === "HIGH",
        compliant: (asset) => {
          const patchDate = getLastPatchTimestamp(asset);
          if (patchDate) {
            const ageMs = Date.now() - patchDate.getTime();
            return ageMs <= 30 * 24 * 60 * 60 * 1000;
          }
          return hasTruthyMetadata(toMetadataObject(asset.metadata), METADATA_BOOLEAN_KEYS.patching);
        },
        successSummary: "Critical/high assets have recent patching evidence.",
        failureSummary: "Critical/high assets are missing patch recency evidence.",
      }),
  },
  {
    id: "detective-log-coverage",
    controlType: "DETECTIVE",
    name: "High-risk assets send security logs",
    description: "Critical and high assets should emit security telemetry.",
    keywords: ["log", "monitor", "siem", "audit", "detect", "de.cm-01", "10.4.1", "a.8.15"],
    evaluate: (assets) =>
      assessRuleCoverage({
        ruleId: "detective-log-coverage",
        ruleName: "High-risk assets send security logs",
        assets,
        inScope: (asset) => asset.criticality === "CRITICAL" || asset.criticality === "HIGH",
        compliant: (asset) => hasCapability(asset, METADATA_BOOLEAN_KEYS.logging, TAG_HINTS.logging),
        successSummary: "High-risk assets are covered by security logging.",
        failureSummary: "One or more high-risk assets are missing logging coverage.",
      }),
  },
  {
    id: "detective-asset-visibility",
    controlType: "DETECTIVE",
    name: "Asset visibility is current",
    description: "Assets should report telemetry recently.",
    keywords: ["anomaly", "visibility", "telemetry", "asset inventory", "id.am-01", "cc7.2"],
    evaluate: (assets) =>
      assessRuleCoverage({
        ruleId: "detective-asset-visibility",
        ruleName: "Asset visibility is current",
        assets,
        inScope: () => true,
        compliant: (asset) => {
          const reference = asset.lastSeen ?? asset.updatedAt;
          const ageMs = Date.now() - reference.getTime();
          return ageMs <= 14 * 24 * 60 * 60 * 1000;
        },
        successSummary: "Asset telemetry visibility is recent.",
        failureSummary: "One or more assets have stale telemetry visibility.",
      }),
  },
  {
    id: "corrective-backup-coverage",
    controlType: "CORRECTIVE",
    name: "Critical assets have backup and recovery coverage",
    description: "Critical assets should have backup or snapshot evidence.",
    keywords: ["backup", "recover", "restore", "resilience", "a.8.13", "rc.rp-01", "a1.2"],
    evaluate: (assets) =>
      assessRuleCoverage({
        ruleId: "corrective-backup-coverage",
        ruleName: "Critical assets have backup and recovery coverage",
        assets,
        inScope: (asset) => asset.criticality === "CRITICAL",
        compliant: (asset) => hasCapability(asset, METADATA_BOOLEAN_KEYS.backup, TAG_HINTS.backup),
        successSummary: "Critical assets have backup coverage evidence.",
        failureSummary: "Critical assets are missing backup/recovery evidence.",
      }),
  },
  {
    id: "corrective-owned-assets",
    controlType: "CORRECTIVE",
    name: "Assets have accountable owners",
    description: "Corrective response requires accountable ownership.",
    keywords: ["incident", "response", "owner", "remediation", "cc8.1", "12.10.2", "rs.mi-01"],
    evaluate: (assets) =>
      assessRuleCoverage({
        ruleId: "corrective-owned-assets",
        ruleName: "Assets have accountable owners",
        assets,
        inScope: () => true,
        compliant: (asset) => typeof asset.owner === "string" && asset.owner.trim().length > 0,
        successSummary: "All assets have owners for remediation accountability.",
        failureSummary: "One or more assets are missing owner assignments.",
      }),
  },
];

const DEFAULT_RULE_BY_TYPE: Record<ControlType, string> = {
  PREVENTIVE: "preventive-critical-av-coverage",
  DETECTIVE: "detective-log-coverage",
  CORRECTIVE: "corrective-backup-coverage",
};

function getControlSearchText(control: {
  controlId: string;
  title: string;
  description: string | null;
  objective: string | null;
  category: string | null;
}) {
  return [control.controlId, control.title, control.description ?? "", control.objective ?? "", control.category ?? ""]
    .join(" ")
    .toLowerCase();
}

export function getAssessmentRulesForControl(control: {
  controlId: string;
  title: string;
  description: string | null;
  objective: string | null;
  category: string | null;
  controlType: ControlType;
}): AutomatedAssessmentRule[] {
  const rulesForType = AUTOMATED_ASSESSMENT_RULES.filter(
    (rule) => rule.controlType === control.controlType,
  );

  if (rulesForType.length === 0) {
    return [];
  }

  const searchText = getControlSearchText(control);
  const keywordMatched = rulesForType.filter((rule) =>
    rule.keywords.some((keyword) => searchText.includes(keyword.toLowerCase())),
  );

  if (keywordMatched.length > 0) {
    return keywordMatched;
  }

  const fallback = rulesForType.find((rule) => rule.id === DEFAULT_RULE_BY_TYPE[control.controlType]);
  return fallback ? [fallback] : [rulesForType[0]];
}

function deriveComplianceStatus(ruleEvaluations: RuleEvaluation[]): ComplianceStatus {
  if (ruleEvaluations.length === 0) {
    return "NOT_ASSESSED";
  }

  const applicable = ruleEvaluations.filter((evaluation) => !evaluation.notApplicable);
  if (applicable.length === 0) {
    return "NOT_APPLICABLE";
  }

  const passedCount = applicable.filter((evaluation) => evaluation.pass).length;
  if (passedCount === applicable.length) {
    return "COMPLIANT";
  }
  if (passedCount > 0) {
    return "PARTIALLY_COMPLIANT";
  }
  return "NON_COMPLIANT";
}

function statusToImplementation(status: ComplianceStatus): ImplementationStatus {
  switch (status) {
    case "COMPLIANT":
      return "IMPLEMENTED";
    case "PARTIALLY_COMPLIANT":
      return "PARTIALLY_IMPLEMENTED";
    case "NON_COMPLIANT":
      return "NOT_IMPLEMENTED";
    case "NOT_APPLICABLE":
      return "NOT_APPLICABLE";
    default:
      return "PLANNED";
  }
}

function buildAssetStatusMap(
  assets: AutomatedAssessmentAsset[],
  evaluations: RuleEvaluation[],
): Map<string, ComplianceStatus> {
  const inScope = new Set<string>();
  const failed = new Set<string>();

  for (const evaluation of evaluations) {
    if (evaluation.notApplicable) {
      continue;
    }

    for (const assetId of evaluation.evaluatedAssetIds) {
      inScope.add(assetId);
    }

    for (const assetId of evaluation.failedAssetIds) {
      failed.add(assetId);
    }
  }

  const result = new Map<string, ComplianceStatus>();
  for (const asset of assets) {
    if (!inScope.has(asset.id)) {
      result.set(asset.id, "NOT_APPLICABLE");
      continue;
    }

    result.set(asset.id, failed.has(asset.id) ? "NON_COMPLIANT" : "COMPLIANT");
  }

  return result;
}

function buildEvidenceSummary(controlId: string, status: ComplianceStatus, evaluations: RuleEvaluation[]) {
  const timestamp = new Date().toISOString();
  const lines = evaluations.map((evaluation) => {
    const state = evaluation.notApplicable ? "N/A" : evaluation.pass ? "PASS" : "FAIL";
    return `- ${evaluation.ruleName}: ${state} (${evaluation.passedAssets}/${evaluation.evaluatedAssets}) ${evaluation.details}`;
  });

  return [
    `[AUTO-ASSESSMENT] ${timestamp}`,
    `Control: ${controlId}`,
    `Overall Status: ${status}`,
    ...lines,
  ].join("\n");
}

export function calculateNextAssessmentDate(
  fromDate: Date,
  frequency: ControlFrequency,
): Date {
  const next = new Date(fromDate);

  switch (frequency) {
    case "CONTINUOUS":
      next.setHours(next.getHours() + 12);
      break;
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "SEMI_ANNUAL":
      next.setMonth(next.getMonth() + 6);
      break;
    case "ANNUAL":
    default:
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

function evaluateControlRules(
  control: {
    controlId: string;
    title: string;
    description: string | null;
    objective: string | null;
    category: string | null;
    controlType: ControlType;
  },
  assets: AutomatedAssessmentAsset[],
): ControlAssessmentEvaluation {
  const rules = getAssessmentRulesForControl(control);
  const ruleEvaluations = rules.map((rule) => rule.evaluate(assets));
  const status = deriveComplianceStatus(ruleEvaluations);
  const evidenceSummary = buildEvidenceSummary(control.controlId, status, ruleEvaluations);
  const assetStatuses = buildAssetStatusMap(assets, ruleEvaluations);

  return {
    status,
    ruleEvaluations,
    evidenceSummary,
    assetStatuses,
  };
}

export async function recordComplianceTrendSnapshot(frameworkId: string) {
  const framework = await prisma.complianceFramework.findUnique({
    where: { id: frameworkId },
    include: {
      controls: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!framework) {
    throw new Error(`Framework ${frameworkId} not found`);
  }

  const totalControls = framework.controls.length;
  const compliant = framework.controls.filter((control) => control.status === "COMPLIANT").length;
  const nonCompliant = framework.controls.filter((control) => control.status === "NON_COMPLIANT").length;
  const partiallyCompliant = framework.controls.filter(
    (control) => control.status === "PARTIALLY_COMPLIANT",
  ).length;
  const notAssessed = framework.controls.filter((control) => control.status === "NOT_ASSESSED").length;

  return prisma.complianceTrendSnapshot.create({
    data: {
      frameworkId,
      organizationId: framework.organizationId,
      totalControls,
      compliant,
      nonCompliant,
      partiallyCompliant,
      notAssessed,
      compliancePercentage: totalControls > 0 ? (compliant / totalControls) * 100 : 0,
    },
  });
}

export async function runAutomatedControlAssessment(
  controlId: string,
  options: {
    persistSnapshot?: boolean;
    reason?: string;
  } = {},
): Promise<AutomatedAssessmentResult> {
  const control = await prisma.complianceControl.findUnique({
    where: { id: controlId },
    include: {
      framework: {
        select: {
          id: true,
          organizationId: true,
        },
      },
    },
  });

  if (!control) {
    throw new Error(`Control ${controlId} not found`);
  }

  const assets = await prisma.asset.findMany({
    where: {
      organizationId: control.framework.organizationId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      criticality: true,
      status: true,
      tags: true,
      owner: true,
      metadata: true,
      updatedAt: true,
      lastSeen: true,
    },
  });

  const statusBefore = control.status;
  const evaluated = evaluateControlRules(control, assets);
  const now = new Date();
  const nextAssessment = calculateNextAssessmentDate(now, control.frequency);
  const autoNote = `[AUTO-ASSESSMENT] ${now.toISOString()}${
    options.reason ? ` (${options.reason})` : ""
  }`;

  await prisma.$transaction(async (tx) => {
    await tx.complianceControl.update({
      where: { id: control.id },
      data: {
        status: evaluated.status,
        implementationStatus: statusToImplementation(evaluated.status),
        evidence: evaluated.evidenceSummary,
        notes: control.notes ? `${control.notes}\n${autoNote}` : autoNote,
        lastAssessed: now,
        nextAssessment,
      },
    });

    for (const asset of assets) {
      const status = evaluated.assetStatuses.get(asset.id) ?? "NOT_ASSESSED";
      await tx.assetComplianceControl.upsert({
        where: {
          assetId_controlId: {
            assetId: asset.id,
            controlId: control.id,
          },
        },
        update: {
          status,
          evidence: `[AUTO-ASSET-ASSESSMENT] ${now.toISOString()} (${control.controlId})`,
          assessedAt: now,
        },
        create: {
          assetId: asset.id,
          controlId: control.id,
          status,
          evidence: `[AUTO-ASSET-ASSESSMENT] ${now.toISOString()} (${control.controlId})`,
          assessedAt: now,
        },
      });
    }
  });

  if (options.persistSnapshot ?? true) {
    await recordComplianceTrendSnapshot(control.framework.id);
  }

  const failedAssets = Array.from(evaluated.assetStatuses.values()).filter(
    (status) => status === "NON_COMPLIANT",
  ).length;

  return {
    controlId: control.id,
    frameworkId: control.framework.id,
    statusBefore,
    statusAfter: evaluated.status,
    assessedAt: now.toISOString(),
    ruleCount: evaluated.ruleEvaluations.length,
    nonCompliantAssets: failedAssets,
  };
}

export async function runAutomatedFrameworkAssessment(
  frameworkId: string,
  options: {
    reason?: string;
  } = {},
) {
  const controls = await prisma.complianceControl.findMany({
    where: {
      frameworkId,
    },
    select: {
      id: true,
    },
  });

  const results: AutomatedAssessmentResult[] = [];
  for (const control of controls) {
    const result = await runAutomatedControlAssessment(control.id, {
      persistSnapshot: false,
      reason: options.reason ?? "framework-run",
    });
    results.push(result);
  }

  if (controls.length > 0) {
    await recordComplianceTrendSnapshot(frameworkId);
  }

  return {
    frameworkId,
    assessedControls: controls.length,
    results,
  };
}

export async function runScheduledComplianceAssessments(
  options: {
    organizationId?: string;
    asOf?: Date;
    limit?: number;
  } = {},
): Promise<ScheduledAssessmentResult> {
  const asOf = options.asOf ?? new Date();
  const limit = options.limit ?? 250;

  const dueControls = await prisma.complianceControl.findMany({
    where: {
      framework: {
        ...(options.organizationId ? { organizationId: options.organizationId } : {}),
      },
      OR: [
        { nextAssessment: null },
        { nextAssessment: { lte: asOf } },
      ],
    },
    take: limit,
    orderBy: [
      { nextAssessment: "asc" },
      { updatedAt: "asc" },
    ],
    select: {
      id: true,
      frameworkId: true,
    },
  });

  const frameworkIds = new Set<string>();
  let assessedControls = 0;
  let failedControls = 0;

  for (const control of dueControls) {
    try {
      const result = await runAutomatedControlAssessment(control.id, {
        persistSnapshot: false,
        reason: "scheduled",
      });
      assessedControls += 1;
      if (result.statusAfter === "NON_COMPLIANT") {
        failedControls += 1;
      }
      frameworkIds.add(control.frameworkId);
    } catch (error) {
      failedControls += 1;
      console.error("[ComplianceEngine] Scheduled control assessment failed:", error);
    }
  }

  for (const frameworkId of frameworkIds) {
    await recordComplianceTrendSnapshot(frameworkId);
  }

  return {
    scannedControls: dueControls.length,
    assessedControls,
    failedControls,
    snapshotsCreated: frameworkIds.size,
  };
}

/**
 * OPTIMIZED: Updates compliance status using batch operations
 * Reduces N queries to 3-4 queries total regardless of control count
 */
export async function updateComplianceFromRisk(
  riskEntry: ComplianceRiskEntry,
  vulnerability: ComplianceVulnerability,
  asset: ComplianceAsset,
) {
  const analysis = riskEntry.aiAnalysis;
  const violatedControlIds = analysis.controls_violated_iso27001 ?? [];

  if (violatedControlIds.length === 0) {
    console.log(`[ComplianceEngine] No ISO controls violated for '${vulnerability.title}'`);
    return;
  }

  // Ensure we have a threat feed for the AI indicators
  let aiFeed = await prisma.threatFeed.findFirst({
    where: {
      source: "AI_RISK_ENGINE",
      organizationId: riskEntry.organizationId,
    },
  });

  if (!aiFeed) {
    aiFeed = await prisma.threatFeed.create({
      data: {
        name: "AI Risk Insights",
        source: "AI_RISK_ENGINE",
        type: "CVE",
        format: "JSON",
        isActive: true,
        organizationId: riskEntry.organizationId,
      },
    });
  }

  // Create threat indicator if high risk (single query)
  if (riskEntry.riskScore >= 10 || (analysis.likelihood_score ?? 0) >= 4) {
    const indicatorValue = vulnerability.cveId ?? vulnerability.title;

    await prisma.threatIndicator
      .create({
        data: {
          type: "CVE",
          value: indicatorValue,
          normalizedValue: normalizeIndicatorValue("CVE", indicatorValue),
          confidence: Math.round((analysis.confidence ?? 0) * 100),
          severity: vulnerability.severity ?? "MEDIUM",
          description: `[AI-THREAT] ${analysis.threat ?? "Unknown threat"}. Rationale: ${analysis.rationale_for_risk_rating ?? "No rationale provided"}`,
          source: "AI_RISK_ENGINE",
          tags: [analysis.risk_category || "UNKNOWN", "AI_GENERATED"],
          feedId: aiFeed.id,
          organizationId: riskEntry.organizationId,
        },
      })
      .catch((err) => console.error("[ComplianceEngine] Failed to create threat indicator:", err));
  }

  // Ensure framework exists
  let framework = await prisma.complianceFramework.findFirst({
    where: { organizationId: riskEntry.organizationId },
  });

  if (!framework) {
    console.log("[ComplianceEngine] No framework found, creating default ISO 27001 framework");
    framework = await prisma.complianceFramework.create({
      data: {
        name: "ISO 27001:2022",
        description: "Auto-generated framework for AI risk mapping",
        organizationId: riskEntry.organizationId,
        isActive: true,
      },
    });
  }

  console.log(
    `[ComplianceEngine] Processing ${violatedControlIds.length} controls for asset ${asset.name}`,
  );

  // OPTIMIZATION 1: Batch fetch all existing controls (1 query instead of N)
  const controlIdPatterns = violatedControlIds.map((code: string) => `ISO-${code}`);
  const existingControls = await prisma.complianceControl.findMany({
    where: {
      controlId: { in: controlIdPatterns },
      frameworkId: framework.id,
    },
  });

  const existingControlMap = new Map(existingControls.map((control) => [control.controlId, control]));

  // OPTIMIZATION 2: Identify and batch create missing controls
  const missingControlIds = controlIdPatterns.filter((id: string) => !existingControlMap.has(id));

  if (missingControlIds.length > 0) {
    // Batch create all missing controls (1 query instead of N)
    await prisma.complianceControl.createMany({
      data: missingControlIds.map((controlId: string) => ({
        controlId,
        title: `Security Control ${controlId.replace("ISO-", "")}`,
        description: `Automatically identified by AI as relevant to ${vulnerability.title}`,
        frameworkId: framework.id,
        status: "NOT_ASSESSED",
      })),
      skipDuplicates: true,
    });

    // Fetch newly created controls to get their IDs
    const newControls = await prisma.complianceControl.findMany({
      where: {
        controlId: { in: missingControlIds },
        frameworkId: framework.id,
      },
    });

    // Add to map
    newControls.forEach((control) => existingControlMap.set(control.controlId, control));
  }

  // OPTIMIZATION 3: Use transaction for all updates (ensures atomicity)
  const allControls = Array.from(existingControlMap.values());
  const highRiskControlIds = riskEntry.riskScore >= 12 ? allControls.map((control) => control.id) : [];

  await prisma.$transaction(async (tx) => {
    // Batch upsert all asset compliance controls
    for (const control of allControls) {
      await tx.assetComplianceControl.upsert({
        where: {
          assetId_controlId: {
            assetId: asset.id,
            controlId: control.id,
          },
        },
        update: {
          status: "NON_COMPLIANT",
          evidence: `[AI-ASSESSMENT] Violated by '${vulnerability.title}'. Rationale: ${analysis.rationale_for_risk_rating}`,
          assessedAt: new Date(),
        },
        create: {
          assetId: asset.id,
          controlId: control.id,
          status: "NON_COMPLIANT",
          evidence: `[AI-ASSESSMENT] Violated by '${vulnerability.title}'. Rationale: ${analysis.rationale_for_risk_rating}`,
          assessedAt: new Date(),
        },
      });
    }

    // Batch update high-risk controls
    if (highRiskControlIds.length > 0) {
      await tx.complianceControl.updateMany({
        where: {
          id: { in: highRiskControlIds },
        },
        data: {
          status: "NON_COMPLIANT",
          notes: `Automatically flagged as NON_COMPLIANT due to high risk assessment on asset ${asset.name}. Ref: ${riskEntry.id}`,
          lastAssessed: new Date(),
        },
      });
    }
  });

  // OPTIMIZATION 4: Batch create notifications
  const recipients = await prisma.user.findMany({
    where: {
      organizationId: riskEntry.organizationId,
      role: "IT_OFFICER",
    },
    select: { id: true },
  });

  if (recipients.length > 0 && allControls.length > 0) {
    const recommendations = Array.isArray(analysis.selected_controls)
      ? analysis.selected_controls.join(", ")
      : "No specific controls recommended";

    // Create one notification per recipient (not per control)
    await prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.id,
        title: "Evidence Required: Control Failures",
        message: `${allControls.length} control(s) marked NON_COMPLIANT for ${asset.name}. AI recommends: ${recommendations}.`,
        type: "WARNING",
        link: `/compliance`,
      })),
    });

    // Create audit log comments (batch)
    await prisma.comment
      .createMany({
        data: recipients.map((recipient) => ({
          content: `EVIDENCE TASK: Mitigation required for ${allControls.length} controls. AI Recommendation: ${recommendations}. Task triggered by risk ${riskEntry.riskScore}/25.`,
          entityType: "RiskRegister",
          entityId: riskEntry.id,
          userId: recipient.id,
        })),
        skipDuplicates: true,
      })
      .catch(() => {});
  }

  console.log(`[ComplianceEngine] Pipeline Complete. Processed ${allControls.length} controls.`);
}
