import type {
    AssetDataRole,
    VendorAssetRelationshipType,
    VendorDataAccessType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Relationship writes for the GRC graph.
 *
 * Links are replaced wholesale from the editor UI (send the full desired
 * set), and every referenced row is verified to belong to the caller's
 * organization first — the join tables carry no organizationId of their own,
 * so the targets are the only tenant boundary available.
 */

export class RelationshipError extends Error {
    readonly status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "RelationshipError";
        this.status = status;
    }
}

export interface VendorAssetLinkInput {
    assetId: string;
    relationshipType: VendorAssetRelationshipType;
}

export interface VendorDataLinkInput {
    dataAssetId: string;
    accessType: VendorDataAccessType;
}

export interface AssetVendorLinkInput {
    vendorId: string;
    relationshipType: VendorAssetRelationshipType;
}

export interface AssetDataLinkInput {
    dataAssetId: string;
    dataRole: AssetDataRole;
}

/** De-duplicate by target id, last entry winning, and drop empty ids. */
function dedupe<T>(rows: readonly T[], key: (row: T) => string): T[] {
    const byKey = new Map<string, T>();
    for (const row of rows) {
        const id = key(row).trim();
        if (!id) throw new RelationshipError("Relationship target id is required");
        byKey.set(id, row);
    }
    return [...byKey.values()];
}

async function assertAssetsInOrg(assetIds: string[], organizationId: string): Promise<void> {
    const found = await prisma.asset.count({
        where: { id: { in: assetIds }, organizationId },
    });
    if (found !== assetIds.length) {
        throw new RelationshipError("One or more assets do not exist in this organization", 404);
    }
}

async function assertVendorsInOrg(vendorIds: string[], organizationId: string): Promise<void> {
    const found = await prisma.nis2Vendor.count({
        where: { id: { in: vendorIds }, organizationId },
    });
    if (found !== vendorIds.length) {
        throw new RelationshipError("One or more vendors do not exist in this organization", 404);
    }
}

async function assertDataAssetsInOrg(
    dataAssetIds: string[],
    organizationId: string,
): Promise<void> {
    const found = await prisma.dataAsset.count({
        where: { id: { in: dataAssetIds }, organizationId },
    });
    if (found !== dataAssetIds.length) {
        throw new RelationshipError("One or more data records do not exist in this organization", 404);
    }
}

/** Vendor -> assets: which assets the vendor provides, manages, hosts, ... */
export async function replaceVendorAssetLinks(
    vendorId: string,
    organizationId: string,
    rows: readonly VendorAssetLinkInput[],
): Promise<number> {
    const links = dedupe(rows, (row) => row.assetId);
    if (links.length > 0) await assertAssetsInOrg(links.map((row) => row.assetId), organizationId);

    await prisma.$transaction([
        prisma.vendorAssetLink.deleteMany({ where: { vendorId } }),
        prisma.vendorAssetLink.createMany({
            data: links.map((row) => ({ vendorId, ...row })),
        }),
    ]);

    return links.length;
}

/** Vendor -> data: what the vendor collects, accesses, stores, processes, shares. */
export async function replaceVendorDataLinks(
    vendorId: string,
    organizationId: string,
    rows: readonly VendorDataLinkInput[],
): Promise<number> {
    const links = dedupe(rows, (row) => row.dataAssetId);
    if (links.length > 0) {
        await assertDataAssetsInOrg(links.map((row) => row.dataAssetId), organizationId);
    }

    await prisma.$transaction([
        prisma.vendorDataLink.deleteMany({ where: { vendorId } }),
        prisma.vendorDataLink.createMany({ data: links.map((row) => ({ vendorId, ...row })) }),
    ]);

    return links.length;
}

/** Asset -> vendors: the reverse of the vendor->asset relationship. */
export async function replaceAssetVendorLinks(
    assetId: string,
    organizationId: string,
    rows: readonly AssetVendorLinkInput[],
): Promise<number> {
    const links = dedupe(rows, (row) => row.vendorId);
    if (links.length > 0) {
        await assertVendorsInOrg(links.map((row) => row.vendorId), organizationId);
    }

    await prisma.$transaction([
        prisma.vendorAssetLink.deleteMany({ where: { assetId } }),
        prisma.vendorAssetLink.createMany({ data: links.map((row) => ({ assetId, ...row })) }),
    ]);

    return links.length;
}

/** Asset -> data: what the asset stores, processes or transits. */
export async function replaceAssetDataLinks(
    assetId: string,
    organizationId: string,
    rows: readonly AssetDataLinkInput[],
): Promise<number> {
    const links = dedupe(rows, (row) => row.dataAssetId);
    if (links.length > 0) {
        await assertDataAssetsInOrg(links.map((row) => row.dataAssetId), organizationId);
    }

    await prisma.$transaction([
        prisma.assetDataLink.deleteMany({ where: { assetId } }),
        prisma.assetDataLink.createMany({ data: links.map((row) => ({ assetId, ...row })) }),
    ]);

    return links.length;
}

export interface PolicyLinkSet {
    riskIds?: string[];
    assetIds?: string[];
    vendorIds?: string[];
    dataAssetIds?: string[];
    controlIds?: string[];
}

/**
 * Replace every link set a policy provides in one transaction. Only the keys
 * present in `sets` are touched, so a partial update leaves the rest alone.
 */
export async function replacePolicyLinks(
    policyId: string,
    organizationId: string,
    sets: PolicyLinkSet,
): Promise<void> {
    const riskIds = [...new Set(sets.riskIds ?? [])];
    const assetIds = [...new Set(sets.assetIds ?? [])];
    const vendorIds = [...new Set(sets.vendorIds ?? [])];
    const dataAssetIds = [...new Set(sets.dataAssetIds ?? [])];
    const controlIds = [...new Set(sets.controlIds ?? [])];

    if (riskIds.length) {
        const found = await prisma.riskRegister.count({
            where: { id: { in: riskIds }, organizationId },
        });
        if (found !== riskIds.length) {
            throw new RelationshipError("One or more risks do not exist in this organization", 404);
        }
    }
    if (assetIds.length) await assertAssetsInOrg(assetIds, organizationId);
    if (vendorIds.length) await assertVendorsInOrg(vendorIds, organizationId);
    if (dataAssetIds.length) await assertDataAssetsInOrg(dataAssetIds, organizationId);
    if (controlIds.length) {
        const found = await prisma.complianceControl.count({
            where: { id: { in: controlIds }, framework: { organizationId } },
        });
        if (found !== controlIds.length) {
            throw new RelationshipError(
                "One or more controls do not exist in this organization",
                404,
            );
        }
    }

    const operations = [];
    if (sets.riskIds) {
        operations.push(
            prisma.policyRiskLink.deleteMany({ where: { policyId } }),
            prisma.policyRiskLink.createMany({
                data: riskIds.map((riskId) => ({ policyId, riskId })),
            }),
        );
    }
    if (sets.assetIds) {
        operations.push(
            prisma.policyAssetLink.deleteMany({ where: { policyId } }),
            prisma.policyAssetLink.createMany({
                data: assetIds.map((assetId) => ({ policyId, assetId })),
            }),
        );
    }
    if (sets.vendorIds) {
        operations.push(
            prisma.policyVendorLink.deleteMany({ where: { policyId } }),
            prisma.policyVendorLink.createMany({
                data: vendorIds.map((vendorId) => ({ policyId, vendorId })),
            }),
        );
    }
    if (sets.dataAssetIds) {
        operations.push(
            prisma.policyDataLink.deleteMany({ where: { policyId } }),
            prisma.policyDataLink.createMany({
                data: dataAssetIds.map((dataAssetId) => ({ policyId, dataAssetId })),
            }),
        );
    }
    if (sets.controlIds) {
        operations.push(
            prisma.policyControlLink.deleteMany({ where: { policyId } }),
            prisma.policyControlLink.createMany({
                data: controlIds.map((controlId) => ({ policyId, controlId })),
            }),
        );
    }

    if (operations.length > 0) {
        await prisma.$transaction(operations);
    }
}
