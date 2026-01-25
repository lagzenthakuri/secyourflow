import { PrismaClient, Role, AssetType, Environment, Criticality, AssetStatus, Severity, VulnStatus, VulnSource, ThreatFeedType, IndicatorType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as bcrypt from 'bcryptjs'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('Seed started...')

    // 1. Create Organization
    const org = await prisma.organization.upsert({
        where: { id: 'org_1' },
        update: {},
        create: {
            id: 'org_1',
            name: 'Acme Security Corp',
            domain: 'acme.com',
        },
    })

    // 2. Create Users for each role
    const roles = Object.values(Role)
    const password = await bcrypt.hash('password123', 10)

    for (const role of roles) {
        const email = `${role.toLowerCase()}@acme.com`
        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                name: role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
                password,
                role,
                organizationId: org.id,
            },
        })
    }

    // 3. Create Assets
    const assetData = [
        { name: 'prod-db-01', type: AssetType.DATABASE, criticality: Criticality.CRITICAL, ipAddress: '10.0.1.5' },
        { name: 'web-front-01', type: AssetType.SERVER, criticality: Criticality.HIGH, ipAddress: '10.0.1.10' },
        { name: 'api-gateway', type: AssetType.APPLICATION, criticality: Criticality.CRITICAL, ipAddress: '10.0.1.15' },
        { name: 'workstation-dev-01', type: AssetType.WORKSTATION, criticality: Criticality.LOW, ipAddress: '192.168.1.50' },
        { name: 'core-router-01', type: AssetType.NETWORK_DEVICE, criticality: Criticality.HIGH, ipAddress: '10.0.0.1' },
    ]

    const assets = []
    for (const a of assetData) {
        const asset = await prisma.asset.create({
            data: {
                ...a,
                organizationId: org.id,
                environment: Environment.PRODUCTION,
                status: AssetStatus.ACTIVE,
            }
        })
        assets.push(asset)
    }

    // 4. Create Vulnerabilities
    const vulnData = [
        { cveId: 'CVE-2024-3400', title: 'Critical PAN-OS Command Injection', severity: Severity.CRITICAL, cvssScore: 10.0, isExploited: true, cisaKev: true },
        { cveId: 'CVE-2024-21762', title: 'FortiOS Out-of-bounds Write', severity: Severity.CRITICAL, cvssScore: 9.8, isExploited: true, cisaKev: true },
        { cveId: 'CVE-2023-38146', title: 'Windows Theme Remote Code Execution', severity: Severity.HIGH, cvssScore: 8.8, isExploited: false, cisaKev: false },
        { cveId: 'CVE-2023-4966', title: 'Citrix Bleed Information Disclosure', severity: Severity.CRITICAL, cvssScore: 9.4, isExploited: true, cisaKev: true },
    ]

    for (const v of vulnData) {
        const vuln = await prisma.vulnerability.create({
            data: {
                ...v,
                organizationId: org.id,
                source: VulnSource.NESSUS,
                status: VulnStatus.OPEN,
            }
        })

        // Link to random assets
        const randomAsset = assets[Math.floor(Math.random() * assets.length)]
        await prisma.assetVulnerability.create({
            data: {
                assetId: randomAsset.id,
                vulnerabilityId: vuln.id,
                status: VulnStatus.OPEN,
            }
        })
    }

    // 5. Create Compliance
    const framework = await prisma.complianceFramework.create({
        data: {
            name: 'ISO 27001',
            organizationId: org.id,
            isActive: true,
        }
    })

    await prisma.complianceControl.createMany({
        data: [
            { frameworkId: framework.id, controlId: 'A.5.1', title: 'Policies for information security', status: 'COMPLIANT' },
            { frameworkId: framework.id, controlId: 'A.9.1', title: 'Access control policy', status: 'NON_COMPLIANT' },
        ]
    })

    // 6. Create Risk Snapshots
    await prisma.riskSnapshot.create({
        data: {
            date: new Date(),
            totalAssets: assets.length,
            criticalAssets: assets.filter(a => a.criticality === 'CRITICAL').length,
            totalVulns: vulnData.length,
            criticalVulns: vulnData.filter(v => v.severity === 'CRITICAL').length,
            highVulns: vulnData.filter(v => v.severity === 'HIGH').length,
            mediumVulns: 0,
            lowVulns: 0,
            exploitedVulns: vulnData.filter(v => v.isExploited).length,
            cisaKevVulns: vulnData.filter(v => v.cisaKev).length,
            overallRiskScore: 65.5,
            complianceScore: 82.0,
        }
    })

    console.log('Seed completed successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
