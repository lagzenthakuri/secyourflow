import bcrypt from "bcryptjs";
import {
    buildAssetOverview,
    buildVendorList,
    buildVendorOverview,
} from "@/lib/grc/overviews";
import {
    replaceAssetVendorLinks,
    replaceVendorAssetLinks,
} from "@/lib/grc/relationships";
import prisma from "@/lib/prisma";

/** KEEP=1 leaves the seeded graph in the database for a manual UI pass. */
const KEEP = process.env.KEEP === "1";
const SMOKE_PASSWORD = "Smoke1234!";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
    const suffix = Date.now().toString(36);
    const org = await prisma.organization.create({
        data: { name: `Smoke Org ${suffix}` },
    });

    try {
        const smokeEmail = `smoke-${suffix}@example.com`;
        await prisma.user.create({
            data: {
                email: smokeEmail,
                name: "Smoke Tester",
                organizationId: org.id,
                role: "MAIN_OFFICER",
                password: await bcrypt.hash(SMOKE_PASSWORD, 10),
            },
        });

        const vendor = await prisma.nis2Vendor.create({
            data: {
                organizationId: org.id,
                name: `Acme Backup ${suffix}`,
                serviceProvided: "Managed backup service",
                criticality: "LEVEL_3",
                dataAccessLevel: "CONFIDENTIAL",
                country: "DE",
                euBased: true,
                slaDefined: true,
                auditRights: true,
                securityClauses: true,
            },
        });

        const asset = await prisma.asset.create({
            data: {
                organizationId: org.id,
                name: `Backup Cluster ${suffix}`,
                type: "SERVER",
                ipAddress: "10.0.0.9",
                environment: "PRODUCTION",
                criticality: "HIGH",
                status: "ACTIVE",
                owner: "Platform Team",
            },
        });

        const dataAsset = await prisma.dataAsset.create({
            data: {
                organizationId: org.id,
                name: `Customer Backups ${suffix}`,
                category: "CUSTOMER_PII",
                classification: "RESTRICTED",
            },
        });

        await replaceVendorAssetLinks(vendor.id, org.id, [
            { assetId: asset.id, relationshipType: "OPERATES" },
        ]);
        await replaceAssetVendorLinks(asset.id, org.id, [
            { vendorId: vendor.id, relationshipType: "OPERATES" },
        ]);
        await prisma.vendorDataLink.create({
            data: { vendorId: vendor.id, dataAssetId: dataAsset.id, accessType: "STORES" },
        });
        await prisma.assetDataLink.create({
            data: { assetId: asset.id, dataAssetId: dataAsset.id, dataRole: "STORES" },
        });

        const vulnerability = await prisma.vulnerability.create({
            data: {
                organizationId: org.id,
                title: "Backups without integrity checks",
                severity: "HIGH",
                source: "MANUAL",
                status: "OPEN",
            },
        });

        // Primary risk: directly attributed to the vendor, also on the asset.
        // Score 4 x 5 = 20 -> CRITICAL, category RANSOMWARE vs tolerance 8 -> EXCEEDED.
        const risk = await prisma.riskRegister.create({
            data: {
                organizationId: org.id,
                assetId: asset.id,
                vulnerabilityId: vulnerability.id,
                vendorId: vendor.id,
                riskScore: 20,
                impactScore: 5,
                likelihoodScore: 4,
                status: "ACTIVE",
                analysisSource: "DETERMINISTIC",
                aiAnalysis: { risk_category: "CRITICAL", risk_category_2: "RANSOMWARE" },
                riskCategory2: "RANSOMWARE",
                isResolved: false,
            },
        });

        // Second risk: only on the asset (no vendor attribution), no matching
        // appetite statement -> NOT_EVALUATED.
        const otherVulnerability = await prisma.vulnerability.create({
            data: {
                organizationId: org.id,
                title: "Flood risk for the datacenter",
                severity: "LOW",
                source: "MANUAL",
                status: "OPEN",
            },
        });
        const otherRisk = await prisma.riskRegister.create({
            data: {
                organizationId: org.id,
                assetId: asset.id,
                vulnerabilityId: otherVulnerability.id,
                riskScore: 5,
                impactScore: 5,
                likelihoodScore: 1,
                status: "ACTIVE",
                analysisSource: "DETERMINISTIC",
                aiAnalysis: { risk_category: "LOW" },
                riskCategory2: "FLOOD",
                isResolved: false,
            },
        });

        await prisma.riskAppetite.create({
            data: {
                organizationId: org.id,
                category: "RANSOMWARE",
                appetiteLevel: "CAUTIOUS",
                toleranceMax: 8,
                statement: "We keep ransomware exposure below 8 on the 25-point scale.",
                boardApproved: true,
                owner: "Board",
            },
        });

        const framework = await prisma.complianceFramework.create({
            data: { organizationId: org.id, name: `Smoke NIS2 ${suffix}`, version: "1.0" },
        });
        const control = await prisma.complianceControl.create({
            data: {
                frameworkId: framework.id,
                controlId: "21.2.d",
                title: "Backup and restoration",
                status: "NOT_ASSESSED",
                riskCategory: "OPERATIONAL",
            },
        });
        await prisma.assetComplianceControl.create({
            data: {
                assetId: asset.id,
                controlId: control.id,
                status: "PARTIALLY_COMPLIANT",
                assessedAt: new Date(),
            },
        });

        const policy = await prisma.policy.create({
            data: {
                organizationId: org.id,
                title: "Backup & Recovery Policy",
                description: "Immutable, tested backups",
                type: "POLICY",
                status: "ACTIVE",
                owner: "Jane Doe",
                nextReview: new Date(Date.now() + 86_400_000 * 100),
            },
        });
        await prisma.policyRiskLink.create({ data: { policyId: policy.id, riskId: risk.id } });
        await prisma.policyAssetLink.create({ data: { policyId: policy.id, assetId: asset.id } });
        await prisma.policyVendorLink.create({ data: { policyId: policy.id, vendorId: vendor.id } });
        await prisma.policyDataLink.create({
            data: { policyId: policy.id, dataAssetId: dataAsset.id },
        });
        await prisma.policyControlLink.create({
            data: { policyId: policy.id, controlId: control.id },
        });

        // --- buildVendorList ------------------------------------------------
        const vendors = await buildVendorList(org.id);
        assert(vendors.length === 1, `vendor list has exactly one vendor (got ${vendors.length})`);
        const row = vendors[0]!;
        assert(row.name === vendor.name, "vendor name matches");
        assert(row.counts.assets === 1, `vendor has one linked asset (got ${row.counts.assets})`);
        assert(row.counts.data === 1, `vendor handles one data asset (got ${row.counts.data})`);
        assert(row.counts.policies === 1, `vendor has one policy (got ${row.counts.policies})`);
        assert(row.counts.openRisks === 2, `vendor sees both risks (got ${row.counts.openRisks})`);
        assert(row.riskLevel === "CRITICAL", `max score 20 => CRITICAL (got ${row.riskLevel})`);
        assert(
            row.appetiteStatus === "EXCEEDED",
            `vendor worst appetite is EXCEEDED (got ${row.appetiteStatus})`,
        );
        assert(
            row.complianceStatus === "PARTIALLY_COMPLIANT",
            `vendor compliance rolls up from asset control (got ${row.complianceStatus})`,
        );
        assert(typeof row.assessment.score === "number", "vendor assessment score computed");

        // --- buildVendorOverview --------------------------------------------
        const vo = await buildVendorOverview(org.id, vendor.id);
        assert(vo, "vendor overview found");
        assert(vo!.summary.assetCount === 1, "summary assetCount 1");
        assert(vo!.summary.dataCount === 1, "summary dataCount 1");
        assert(vo!.summary.policyCount === 1, "summary policyCount 1");
        assert(vo!.summary.riskCount === 2, `summary riskCount 2 (got ${vo!.summary.riskCount})`);
        assert(vo!.summary.riskLevel === "CRITICAL", "summary riskLevel CRITICAL");
        assert(
            vo!.summary.appetiteStatus === "EXCEEDED",
            `summary appetite EXCEEDED (got ${vo!.summary.appetiteStatus})`,
        );
        assert(
            vo!.summary.complianceStatus === "PARTIALLY_COMPLIANT",
            `summary compliance PARTIALLY_COMPLIANT (got ${vo!.summary.complianceStatus})`,
        );
        assert(
            vo!.summary.controlCount === 1,
            `control reached via policy+asset (got ${vo!.summary.controlCount})`,
        );
        assert(
            vo!.assets.some((entry) => entry.id === asset.id),
            "vendor overview lists linked asset",
        );
        assert(
            vo!.data.some((entry) => entry.id === dataAsset.id && entry.accessType === "STORES"),
            "vendor overview lists data asset with access type",
        );
        assert(
            vo!.policies.some((entry) => entry.id === policy.id),
            "vendor overview lists linked policy",
        );
        const direct = vo!.risks.find((entry) => entry.id === risk.id);
        assert(direct, "vendor overview includes direct risk");
        assert(direct!.via === "VENDOR", "direct risk reached via VENDOR");
        assert(
            direct!.appetiteStatus === "EXCEEDED" && direct!.riskLevel === "CRITICAL",
            "direct risk evaluated CRITICAL/EXCEEDED",
        );
        const viaAsset = vo!.risks.find((entry) => entry.id === otherRisk.id);
        assert(viaAsset, "vendor overview includes asset risk");
        assert(viaAsset!.via === "ASSET", "asset risk reached via ASSET");
        assert(
            viaAsset!.appetiteStatus === "NOT_EVALUATED",
            `unmatched risk is NOT_EVALUATED (got ${viaAsset!.appetiteStatus})`,
        );
        const controlRow = vo!.controls.find((entry) => entry.id === control.id);
        assert(controlRow, "vendor overview lists linked control");
        assert(controlRow!.via === "BOTH", `control reached via asset+policy (got ${controlRow!.via})`);
        assert(
            controlRow!.framework === framework.name,
            "control carries framework name",
        );
        assert(vo!.appetite.exceeded === 1 && vo!.appetite.notEvaluated === 1, "appetite counts");

        // --- buildAssetOverview ---------------------------------------------
        const ao = await buildAssetOverview(org.id, asset.id);
        assert(ao, "asset overview found");
        assert(ao!.summary.vendorCount === 1, "summary vendorCount 1");
        assert(ao!.summary.dataCount === 1, "summary dataCount 1");
        assert(ao!.summary.policyCount === 1, "summary policyCount 1");
        assert(ao!.summary.riskCount === 2, `summary riskCount 2 (got ${ao!.summary.riskCount})`);
        assert(ao!.summary.riskLevel === "CRITICAL", "summary riskLevel CRITICAL");
        assert(
            ao!.summary.appetiteStatus === "EXCEEDED",
            `summary appetite EXCEEDED (got ${ao!.summary.appetiteStatus})`,
        );
        assert(
            ao!.summary.complianceStatus === "PARTIALLY_COMPLIANT",
            `summary compliance PARTIALLY_COMPLIANT (got ${ao!.summary.complianceStatus})`,
        );
        assert(
            ao!.vendors.some((entry) => entry.id === vendor.id),
            "asset overview lists vendor",
        );
        assert(
            ao!.data.some((entry) => entry.id === dataAsset.id && entry.dataRole === "STORES"),
            "asset overview lists data asset with role",
        );
        assert(
            ao!.policies.some((entry) => entry.id === policy.id),
            "asset overview lists linked policy",
        );
        assert(
            ao!.risks.some((entry) => entry.id === risk.id && entry.riskLevel === "CRITICAL"),
            "asset overview bands the risk",
        );
        assert(
            ao!.controls.some((entry) => entry.id === control.id && entry.via === "BOTH"),
            "asset overview merges asset-assessed and policy-linked control",
        );

        // --- link replacement round-trip -------------------------------------
        await replaceVendorAssetLinks(vendor.id, org.id, []);
        const vo2 = await buildVendorOverview(org.id, vendor.id);
        assert(vo2!.summary.assetCount === 0, "clearing vendor assets removes them");
        await replaceVendorAssetLinks(vendor.id, org.id, [
            { assetId: asset.id, relationshipType: "HOSTS" },
        ]);
        const vo3 = await buildVendorOverview(org.id, vendor.id);
        assert(vo3!.summary.assetCount === 1, "re-adding vendor asset works");
        assert(
            vo3!.assets[0]!.relationshipType === "HOSTS",
            "relationship type updated in place",
        );

        // Cross-org guard: a foreign asset id must be rejected.
        const foreignOrg = await prisma.organization.create({ data: { name: `Foreign ${suffix}` } });
        try {
            const foreignAsset = await prisma.asset.create({
                data: {
                    organizationId: foreignOrg.id,
                    name: "Foreign asset",
                    type: "SERVER",
                },
            });
            let rejected = false;
            try {
                await replaceVendorAssetLinks(vendor.id, org.id, [
                    { assetId: foreignAsset.id, relationshipType: "HOSTS" },
                ]);
            } catch (error) {
                rejected = true;
                assert(
                    (error as { status?: number }).status === 404,
                    "cross-org link rejected with 404",
                );
            }
            assert(rejected, "cross-organization asset link was rejected");
        } finally {
            await prisma.organization.delete({ where: { id: foreignOrg.id } });
        }
        await replaceVendorAssetLinks(vendor.id, org.id, [
            { assetId: asset.id, relationshipType: "OPERATES" },
        ]);

        console.log("SMOKE OK: all assertions passed");
        if (KEEP) {
            console.log(
                JSON.stringify(
                    {
                        keep: true,
                        organizationId: org.id,
                        email: smokeEmail,
                        password: SMOKE_PASSWORD,
                        vendorId: vendor.id,
                        assetId: asset.id,
                        policyId: policy.id,
                        dataAssetId: dataAsset.id,
                    },
                    null,
                    2,
                ),
            );
        }
        console.log(
            JSON.stringify(
                {
                    vendorList: {
                        counts: row.counts,
                        riskLevel: row.riskLevel,
                        appetiteStatus: row.appetiteStatus,
                        complianceStatus: row.complianceStatus,
                    },
                    vendorOverview: vo3!.summary,
                    assetOverview: ao!.summary,
                    appetite: ao!.appetite,
                },
                null,
                2,
            ),
        );
    } finally {
        // KEEP=1 leaves everything behind for a manual UI pass; otherwise the
        // seed is removed in dependency order (joins cascade from parents).
        if (!KEEP) {
            await prisma.user.deleteMany({ where: { organizationId: org.id } });
            await prisma.policy.deleteMany({ where: { organizationId: org.id } });
            await prisma.riskAppetite.deleteMany({ where: { organizationId: org.id } });
            await prisma.complianceFramework.deleteMany({ where: { organizationId: org.id } });
            await prisma.riskRegister.deleteMany({ where: { organizationId: org.id } });
            await prisma.vulnerability.deleteMany({ where: { organizationId: org.id } });
            await prisma.asset.deleteMany({ where: { organizationId: org.id } });
            await prisma.nis2Vendor.deleteMany({ where: { organizationId: org.id } });
            await prisma.dataAsset.deleteMany({ where: { organizationId: org.id } });
            await prisma.organization.delete({ where: { id: org.id } }).catch(() => undefined);
        }
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
