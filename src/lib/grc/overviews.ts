import type { ComplianceControl, ComplianceStatus, RiskAppetite, RiskAppetiteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { scoreVendor } from "@/lib/nis2/vendors";
import {
    evaluateRiskAppetite,
    riskCategoriesFrom,
    riskLevelForScore,
    worstAppetiteStatus,
    type AppetiteStatement,
    type RiskLevel,
} from "@/lib/grc/appetite";

/**
 * Read-side assembly of the Vendor <-> Asset <-> Data <-> Risk <-> Policy <->
 * Control interconnections. API routes stay thin; every page that needs an
 * overview gets the same numbers.
 */

/** Board-level appetite statements for an organization, newest approval last. */
export async function fetchAppetiteStatements(organizationId: string): Promise<RiskAppetite[]> {
    return prisma.riskAppetite.findMany({
        where: { organizationId },
        orderBy: [{ category: "asc" }],
    });
}

/** The minimum a risk row must carry to be evaluated against appetite. */
export interface GrclRiskRow {
    id: string;
    riskScore: number;
    isResolved: boolean;
    aiAnalysis: unknown;
    riskCategory2: string | null;
}

export interface EvaluatedRisk extends GrclRiskRow {
    riskLevel: RiskLevel;
    appetiteStatus: RiskAppetiteStatus;
    appetiteTolerance: number | null;
    appetiteCategory: string | null;
}

/** Band and appetite-evaluate a batch of risk rows against the statements. */
export function evaluateRiskRows<T extends GrclRiskRow>(
    rows: readonly T[],
    statements: readonly AppetiteStatement[],
): Array<T & EvaluatedRisk> {
    return rows.map((row) => {
        const evaluation = evaluateRiskAppetite(
            row.riskScore,
            riskCategoriesFrom(row),
            statements,
        );

        return {
            ...row,
            riskLevel: riskLevelForScore(row.riskScore),
            appetiteStatus: evaluation.status,
            appetiteTolerance: evaluation.toleranceMax,
            appetiteCategory: evaluation.statement?.category ?? null,
        };
    });
}

export interface AppetiteSummary {
    /** The worst status across the evaluated risks. */
    status: RiskAppetiteStatus;
    evaluated: number;
    within: number;
    approaching: number;
    exceeded: number;
    notEvaluated: number;
    /** Categories that governed at least one of these risks. */
    matchedCategories: string[];
}

/** Roll a set of evaluated risks up to a single appetite position. */
export function summarizeAppetite(risks: readonly EvaluatedRisk[]): AppetiteSummary {
    const counts = { within: 0, approaching: 0, exceeded: 0, notEvaluated: 0 };
    const categories = new Set<string>();

    for (const risk of risks) {
        switch (risk.appetiteStatus) {
            case "WITHIN":
                counts.within += 1;
                break;
            case "APPROACHING":
                counts.approaching += 1;
                break;
            case "EXCEEDED":
                counts.exceeded += 1;
                break;
            default:
                counts.notEvaluated += 1;
        }
        if (risk.appetiteCategory) categories.add(risk.appetiteCategory);
    }

    return {
        status: worstAppetiteStatus(risks.map((risk) => risk.appetiteStatus)),
        evaluated: risks.length,
        ...counts,
        matchedCategories: [...categories].sort(),
    };
}

const COMPLIANCE_SEVERITY: Record<ComplianceStatus, number> = {
    NON_COMPLIANT: 4,
    PARTIALLY_COMPLIANT: 3,
    NOT_ASSESSED: 2,
    COMPLIANT: 1,
    NOT_APPLICABLE: 0,
};

/** Roll control assessment statuses up: any non-compliance wins. */
export function worstComplianceStatus(statuses: readonly ComplianceStatus[]): ComplianceStatus {
    return statuses.reduce<ComplianceStatus>(
        (worst, status) =>
            COMPLIANCE_SEVERITY[status] > COMPLIANCE_SEVERITY[worst] ? status : worst,
        "NOT_APPLICABLE",
    );
}

export interface ControlRow {
    id: string;
    controlId: string;
    title: string;
    framework: string;
    status: ComplianceStatus;
    /** How the control reached this view. */
    via: "ASSET" | "POLICY" | "BOTH";
    assessedAt: Date | null;
}

type ControlWithFramework = ComplianceControl & {
    framework: { id: string; name: string };
};

/** Merge asset-side and policy-side control rows, de-duplicating by control. */
export function mergeControlRows(
    fromAssets: { control: ControlWithFramework; status: ComplianceStatus; assessedAt: Date | null }[],
    fromPolicies: { control: ControlWithFramework }[],
): ControlRow[] {
    const merged = new Map<string, ControlRow>();

    for (const row of fromAssets) {
        merged.set(row.control.id, {
            id: row.control.id,
            controlId: row.control.controlId,
            title: row.control.title,
            framework: row.control.framework.name,
            status: row.status,
            via: "ASSET",
            assessedAt: row.assessedAt,
        });
    }

    for (const row of fromPolicies) {
        const existing = merged.get(row.control.id);
        if (existing) {
            existing.via = "BOTH";
            continue;
        }
        merged.set(row.control.id, {
            id: row.control.id,
            controlId: row.control.controlId,
            title: row.control.title,
            framework: row.control.framework.name,
            // The control's own default until an asset-side assessment exists.
            status: row.control.status,
            via: "POLICY",
            assessedAt: row.control.lastAssessed,
        });
    }

    return [...merged.values()].sort((a, b) => a.framework.localeCompare(b.framework) || a.controlId.localeCompare(b.controlId));
}

export interface VendorListCounts {
    assets: number;
    data: number;
    policies: number;
    risks: number;
    openRisks: number;
}

export interface VendorListRow {
    id: string;
    name: string;
    serviceProvided: string;
    criticality: string;
    dataAccessLevel: string;
    country: string | null;
    euBased: boolean;
    acnRelevant: boolean;
    contactEmail: string | null;
    securityScore: number | null;
    scoredAt: Date | null;
    assessment: ReturnType<typeof scoreVendor>;
    counts: VendorListCounts;
    riskLevel: RiskLevel;
    maxRiskScore: number;
    appetiteStatus: RiskAppetiteStatus;
    complianceStatus: ComplianceStatus;
}

/**
 * Vendor list with its interconnection counts: assets, data types, policies,
 * and the risks reachable directly or through linked assets (open risks only).
 */
export async function buildVendorList(organizationId: string): Promise<VendorListRow[]> {
    const [vendors, statements] = await Promise.all([
        prisma.nis2Vendor.findMany({
            where: { organizationId },
            include: {
                assetLinks: { select: { assetId: true } },
                _count: { select: { dataLinks: true, policyLinks: true } },
            },
            orderBy: [{ criticality: "asc" }, { name: "asc" }],
        }),
        fetchAppetiteStatements(organizationId),
    ]);

    if (vendors.length === 0) return [];

    const vendorIds = new Set(vendors.map((vendor) => vendor.id));
    const assetIds = vendors.flatMap((vendor) => vendor.assetLinks.map((link) => link.assetId));

    const [openRisks, assetLinks, controlRows] = await Promise.all([
        prisma.riskRegister.findMany({
            where: { organizationId, isResolved: false },
            select: { ...riskSelect, assetId: true },
        }),
        prisma.vendorAssetLink.findMany({
            where: { vendorId: { in: [...vendorIds] } },
            select: { vendorId: true, assetId: true },
        }),
        prisma.assetComplianceControl.findMany({
            where: { assetId: { in: assetIds } },
            select: { status: true },
        }),
    ]);

    const assetToVendors = new Map<string, Set<string>>();
    for (const link of assetLinks) {
        const owners = assetToVendors.get(link.assetId) ?? new Set<string>();
        owners.add(link.vendorId);
        assetToVendors.set(link.assetId, owners);
    }

    const evaluated = evaluateRiskRows(openRisks, statements);
    const perVendor = new Map<string, { count: number; maxScore: number; statuses: RiskAppetiteStatus[] }>();
    const bump = (id: string, score: number, status: RiskAppetiteStatus) => {
        const entry = perVendor.get(id) ?? { count: 0, maxScore: 0, statuses: [] };
        entry.count += 1;
        entry.maxScore = Math.max(entry.maxScore, score);
        entry.statuses.push(status);
        perVendor.set(id, entry);
    };

    for (const risk of evaluated) {
        const owners = new Set<string>();
        if (risk.vendorId && vendorIds.has(risk.vendorId)) owners.add(risk.vendorId);
        for (const id of assetToVendors.get(risk.assetId) ?? []) owners.add(id);
        for (const id of owners) bump(id, risk.riskScore, risk.appetiteStatus);
    }

    const complianceStatus = worstComplianceStatus(controlRows.map((row) => row.status));

    return vendors.map((vendor) => {
        const risk = perVendor.get(vendor.id) ?? {
            count: 0,
            maxScore: 0,
            statuses: [] as RiskAppetiteStatus[],
        };

        return {
            id: vendor.id,
            name: vendor.name,
            serviceProvided: vendor.serviceProvided,
            criticality: vendor.criticality,
            dataAccessLevel: vendor.dataAccessLevel,
            country: vendor.country,
            euBased: vendor.euBased,
            acnRelevant: vendor.acnRelevant,
            contactEmail: vendor.contactEmail,
            securityScore: vendor.securityScore,
            scoredAt: vendor.scoredAt,
            assessment: scoreVendor(vendor, new Date()),
            counts: {
                assets: vendor.assetLinks.length,
                data: vendor._count.dataLinks,
                policies: vendor._count.policyLinks,
                risks: risk.count,
                openRisks: risk.count,
            },
            riskLevel: riskLevelForScore(risk.maxScore),
            maxRiskScore: risk.maxScore,
            appetiteStatus: worstAppetiteStatus(risk.statuses),
            complianceStatus,
        };
    });
}

const riskSelect = {
    id: true,
    riskScore: true,
    impactScore: true,
    likelihoodScore: true,
    isResolved: true,
    status: true,
    aiAnalysis: true,
    riskCategory2: true,
    vendorId: true,
    assetId: true,
    createdAt: true,
    vulnerability: { select: { id: true, title: true, cveId: true, severity: true } },
} as const;

export type OverviewRiskRow = EvaluatedRisk;

export interface VendorOverview {
    vendor: VendorWithAssessment;
    assets: {
        id: string;
        name: string;
        type: string;
        criticality: string;
        environment: string;
        status: string;
        owner: string | null;
        relationshipType: string;
        dataCount: number;
    }[];
    data: {
        id: string;
        name: string;
        category: string;
        classification: string;
        accessType: string;
    }[];
    risks: VendorRiskRow[];
    policies: PolicyRow[];
    controls: ControlRow[];
    assessment: ReturnType<typeof scoreVendor>;
    appetite: AppetiteSummary;
    compliance: { status: ComplianceStatus; assessed: number };
    summary: {
        assetCount: number;
        dataCount: number;
        riskCount: number;
        openRiskCount: number;
        maxRiskScore: number;
        riskLevel: RiskLevel;
        policyCount: number;
        controlCount: number;
        appetiteStatus: RiskAppetiteStatus;
        complianceStatus: ComplianceStatus;
    };
}

type VendorWithAssessment = Record<string, unknown> & {
    id: string;
    name: string;
    criticality: string;
};

export interface VendorRiskRow extends EvaluatedRisk {
    assetId: string;
    vulnerability: { id: string; title: string; cveId: string | null; severity: string | null };
    threat: string;
    assetName: string | null;
    /** Whether the risk reached this vendor through a linked asset or directly. */
    via: "VENDOR" | "ASSET";
}

export interface PolicyRow {
    id: string;
    title: string;
    status: string;
    type: string | null;
    version: string;
    owner: string | null;
    nextReview: Date | null;
}

/**
 * The full vendor overview: what the vendor touches, what it does with data,
 * the risks it carries (its own and those on its assets), the policies that
 * govern it, and the controls reached through assets and policies.
 */
export async function buildVendorOverview(
    organizationId: string,
    vendorId: string,
): Promise<VendorOverview | null> {
    const [vendor, statements] = await Promise.all([
        prisma.nis2Vendor.findFirst({
            where: { id: vendorId, organizationId },
            include: {
                assetLinks: {
                    include: {
                        asset: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                criticality: true,
                                environment: true,
                                status: true,
                                owner: true,
                                _count: { select: { dataLinks: true } },
                            },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
                dataLinks: {
                    include: {
                        dataAsset: {
                            select: { id: true, name: true, category: true, classification: true },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
                policyLinks: {
                    include: {
                        policy: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                type: true,
                                version: true,
                                owner: true,
                                nextReview: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
                riskEntries: { select: riskSelect, orderBy: { riskScore: "desc" } },
            },
        }),
        fetchAppetiteStatements(organizationId),
    ]);

    if (!vendor) return null;

    const assetIds = vendor.assetLinks.map((link) => link.asset.id);
    const policyIds = vendor.policyLinks.map((link) => link.policy.id);

    const [assetRisks, controlsViaAssets, controlsViaPolicies] = await Promise.all([
        prisma.riskRegister.findMany({
            where: { organizationId, assetId: { in: assetIds } },
            select: riskSelect,
            orderBy: { riskScore: "desc" },
        }),
        prisma.assetComplianceControl.findMany({
            where: { assetId: { in: assetIds } },
            select: {
                status: true,
                assessedAt: true,
                control: { include: { framework: { select: { id: true, name: true } } } },
            },
        }),
        prisma.policyControlLink.findMany({
            where: { policyId: { in: policyIds } },
            select: { control: { include: { framework: { select: { id: true, name: true } } } } },
        }),
    ]);

    // A risk can appear both directly attributed to the vendor and on one of
    // its assets; show it once.
    const riskRows = [...vendor.riskEntries, ...assetRisks].filter(
        (row, index, all) => all.findIndex((other) => other.id === row.id) === index,
    );
    const risks = evaluateRiskRows(riskRows, statements)
        .map((risk): VendorRiskRow => {
            const analysisThreat = (risk.aiAnalysis as Record<string, unknown> | null)?.threat;
            return {
                ...risk,
                threat:
                    typeof analysisThreat === "string" && analysisThreat.trim().length > 0
                        ? analysisThreat
                        : risk.vulnerability.title,
                assetName: null,
                via: risk.vendorId === vendor.id ? "VENDOR" : "ASSET",
            };
        })
        .sort((a, b) => b.riskScore - a.riskScore);

    // Fill asset names for the risks that came from assets.
    const assetNameById = new Map(vendor.assetLinks.map((link) => [link.asset.id, link.asset.name]));
    for (const risk of risks) {
        risk.assetName = assetNameById.get(risk.assetId) ?? null;
    }

    const controls = mergeControlRows(controlsViaAssets, controlsViaPolicies);
    const assessment = scoreVendor(vendor, new Date());
    const appetite = summarizeAppetite(risks);
    const complianceStatus = worstComplianceStatus(
        controlsViaAssets.map((row) => row.status),
    );
    const maxRiskScore = risks.reduce((max, risk) => Math.max(max, risk.riskScore), 0);

    return {
        vendor: vendor as unknown as VendorWithAssessment,
        assets: vendor.assetLinks.map((link) => ({
            id: link.asset.id,
            name: link.asset.name,
            type: link.asset.type,
            criticality: link.asset.criticality,
            environment: link.asset.environment,
            status: link.asset.status,
            owner: link.asset.owner,
            relationshipType: link.relationshipType,
            dataCount: link.asset._count.dataLinks,
        })),
        data: vendor.dataLinks.map((link) => ({
            id: link.dataAsset.id,
            name: link.dataAsset.name,
            category: link.dataAsset.category,
            classification: link.dataAsset.classification,
            accessType: link.accessType,
        })),
        risks,
        policies: vendor.policyLinks.map((link) => link.policy),
        controls,
        assessment,
        appetite,
        compliance: {
            status: complianceStatus,
            assessed: controlsViaAssets.filter((row) => row.status !== "NOT_ASSESSED").length,
        },
        summary: {
            assetCount: vendor.assetLinks.length,
            dataCount: vendor.dataLinks.length,
            riskCount: risks.length,
            openRiskCount: risks.filter((risk) => !risk.isResolved).length,
            maxRiskScore,
            riskLevel: riskLevelForScore(maxRiskScore),
            policyCount: vendor.policyLinks.length,
            controlCount: controls.length,
            appetiteStatus: appetite.status,
            complianceStatus,
        },
    };
}

export interface AssetOverview {
    asset: Record<string, unknown>;
    vendors: {
        id: string;
        name: string;
        criticality: string;
        serviceProvided: string;
        securityScore: number | null;
        relationshipType: string;
    }[];
    data: {
        id: string;
        name: string;
        category: string;
        classification: string;
        dataRole: string;
    }[];
    risks: EvaluatedRisk[];
    policies: PolicyRow[];
    controls: ControlRow[];
    appetite: AppetiteSummary;
    compliance: { status: ComplianceStatus; assessed: number };
    summary: {
        vendorCount: number;
        dataCount: number;
        riskCount: number;
        openRiskCount: number;
        maxRiskScore: number;
        riskLevel: RiskLevel;
        policyCount: number;
        controlCount: number;
        appetiteStatus: RiskAppetiteStatus;
        complianceStatus: ComplianceStatus;
    };
}

/** The asset's side of the same graph: vendors, data, risks, policies, controls. */
export async function buildAssetOverview(
    organizationId: string,
    assetId: string,
): Promise<AssetOverview | null> {
    const [asset, statements] = await Promise.all([
        prisma.asset.findFirst({
            where: { id: assetId, organizationId },
            include: {
                vendorLinks: {
                    include: {
                        vendor: {
                            select: {
                                id: true,
                                name: true,
                                criticality: true,
                                serviceProvided: true,
                                securityScore: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
                dataLinks: {
                    include: {
                        dataAsset: {
                            select: { id: true, name: true, category: true, classification: true },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
                policyLinks: {
                    include: {
                        policy: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                type: true,
                                version: true,
                                owner: true,
                                nextReview: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
                riskEntries: { select: riskSelect, orderBy: { riskScore: "desc" } },
            },
        }),
        fetchAppetiteStatements(organizationId),
    ]);

    if (!asset) return null;

    const policyIds = asset.policyLinks.map((link) => link.policy.id);

    const [controlRows, controlsViaPolicies] = await Promise.all([
        prisma.assetComplianceControl.findMany({
            where: { assetId: asset.id },
            select: {
                status: true,
                assessedAt: true,
                control: { include: { framework: { select: { id: true, name: true } } } },
            },
        }),
        prisma.policyControlLink.findMany({
            where: { policyId: { in: policyIds } },
            select: { control: { include: { framework: { select: { id: true, name: true } } } } },
        }),
    ]);

    const risks = evaluateRiskRows(asset.riskEntries, statements).sort(
        (a, b) => b.riskScore - a.riskScore,
    );
    const controls = mergeControlRows(controlRows, controlsViaPolicies);
    const appetite = summarizeAppetite(risks);
    const complianceStatus = worstComplianceStatus(controlRows.map((row) => row.status));
    const maxRiskScore = risks.reduce((max, risk) => Math.max(max, risk.riskScore), 0);

    return {
        asset: asset as unknown as Record<string, unknown>,
        vendors: asset.vendorLinks.map((link) => ({
            ...link.vendor,
            relationshipType: link.relationshipType,
        })),
        data: asset.dataLinks.map((link) => ({
            id: link.dataAsset.id,
            name: link.dataAsset.name,
            category: link.dataAsset.category,
            classification: link.dataAsset.classification,
            dataRole: link.dataRole,
        })),
        risks,
        policies: asset.policyLinks.map((link) => link.policy),
        controls,
        appetite,
        compliance: {
            status: complianceStatus,
            assessed: controlRows.filter((row) => row.status !== "NOT_ASSESSED").length,
        },
        summary: {
            vendorCount: asset.vendorLinks.length,
            dataCount: asset.dataLinks.length,
            riskCount: risks.length,
            openRiskCount: risks.filter((risk) => !risk.isResolved).length,
            maxRiskScore,
            riskLevel: riskLevelForScore(maxRiskScore),
            policyCount: asset.policyLinks.length,
            controlCount: controls.length,
            appetiteStatus: appetite.status,
            complianceStatus,
        },
    };
}
