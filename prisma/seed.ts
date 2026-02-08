import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
    console.log("🌱 Seeding compliance frameworks for JBBL...");

    // Get or create default organization
    let org = await prisma.organization.findFirst();
    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: "Jyoti Bikash Bank Limited",
                domain: "jbbl.com.np",
            },
        });
    }

    // ISO 27001:2022 Framework
    const iso27001 = await prisma.complianceFramework.upsert({
        where: { id: "iso27001-2022" },
        update: {},
        create: {
            id: "iso27001-2022",
            name: "ISO/IEC 27001:2022",
            version: "2022",
            description: "International standard for information security management systems",
            organizationId: org.id,
        },
    });

    // ISO 27001 Controls (Annex A - all 93 controls)
    const isoControls = [
        // A.5 Organizational Controls
        { id: "A.5.1", title: "Policies for information security", category: "Organizational", nistCsf: "GOVERN", type: "PREVENTIVE", owner: "CISO" },
        { id: "A.5.2", title: "Information security roles and responsibilities", category: "Organizational", nistCsf: "GOVERN", type: "PREVENTIVE", owner: "CISO" },
        { id: "A.5.3", title: "Segregation of duties", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.4", title: "Management responsibilities", category: "Organizational", nistCsf: "GOVERN", type: "PREVENTIVE", owner: "Board" },
        { id: "A.5.5", title: "Contact with authorities", category: "Organizational", nistCsf: "RESPOND", type: "CORRECTIVE", owner: "CISO" },
        { id: "A.5.6", title: "Contact with special interest groups", category: "Organizational", nistCsf: "IDENTIFY", type: "DETECTIVE", owner: "CISO" },
        { id: "A.5.7", title: "Threat intelligence", category: "Organizational", nistCsf: "DETECT", type: "DETECTIVE", owner: "SOC Team" },
        { id: "A.5.8", title: "Information security in project management", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.9", title: "Inventory of information and associated assets", category: "Organizational", nistCsf: "IDENTIFY", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.5.10", title: "Acceptable use of information and assets", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.11", title: "Return of assets", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "HR" },
        { id: "A.5.12", title: "Classification of information", category: "Organizational", nistCsf: "IDENTIFY", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.13", title: "Labelling of information", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.14", title: "Information transfer", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.15", title: "Access control", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.16", title: "Identity management", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.17", title: "Authentication information", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.18", title: "Access rights", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.19", title: "Information security in supplier relationships", category: "Organizational", nistCsf: "IDENTIFY", type: "PREVENTIVE", owner: "Procurement" },
        { id: "A.5.20", title: "Addressing information security within supplier agreements", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "Legal" },
        { id: "A.5.21", title: "Managing information security in ICT supply chain", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.22", title: "Monitoring, review and change management of supplier services", category: "Organizational", nistCsf: "DETECT", type: "DETECTIVE", owner: "IT Security" },
        { id: "A.5.23", title: "Information security for use of cloud services", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.24", title: "Information security incident management planning and preparation", category: "Organizational", nistCsf: "RESPOND", type: "PREVENTIVE", owner: "SOC Team" },
        { id: "A.5.25", title: "Assessment and decision on information security events", category: "Organizational", nistCsf: "DETECT", type: "DETECTIVE", owner: "SOC Team" },
        { id: "A.5.26", title: "Response to information security incidents", category: "Organizational", nistCsf: "RESPOND", type: "CORRECTIVE", owner: "SOC Team" },
        { id: "A.5.27", title: "Learning from information security incidents", category: "Organizational", nistCsf: "RECOVER", type: "CORRECTIVE", owner: "CISO" },
        { id: "A.5.28", title: "Collection of evidence", category: "Organizational", nistCsf: "RESPOND", type: "DETECTIVE", owner: "SOC Team" },
        { id: "A.5.29", title: "Information security during disruption", category: "Organizational", nistCsf: "RECOVER", type: "CORRECTIVE", owner: "IT Operations" },
        { id: "A.5.30", title: "ICT readiness for business continuity", category: "Organizational", nistCsf: "RECOVER", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.5.31", title: "Legal, statutory, regulatory and contractual requirements", category: "Organizational", nistCsf: "GOVERN", type: "PREVENTIVE", owner: "Legal" },
        { id: "A.5.32", title: "Intellectual property rights", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "Legal" },
        { id: "A.5.33", title: "Protection of records", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.5.34", title: "Privacy and protection of PII", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "DPO" },
        { id: "A.5.35", title: "Independent review of information security", category: "Organizational", nistCsf: "GOVERN", type: "DETECTIVE", owner: "Internal Audit" },
        { id: "A.5.36", title: "Compliance with policies and standards for information security", category: "Organizational", nistCsf: "GOVERN", type: "DETECTIVE", owner: "Internal Audit" },
        { id: "A.5.37", title: "Documented operating procedures", category: "Organizational", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        // A.6 People Controls
        { id: "A.6.1", title: "Screening", category: "People", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "HR" },
        { id: "A.6.2", title: "Terms and conditions of employment", category: "People", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "HR" },
        { id: "A.6.3", title: "Information security awareness, education and training", category: "People", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.6.4", title: "Disciplinary process", category: "People", nistCsf: "RESPOND", type: "CORRECTIVE", owner: "HR" },
        { id: "A.6.5", title: "Responsibilities after termination or change of employment", category: "People", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "HR" },
        { id: "A.6.6", title: "Confidentiality or non-disclosure agreements", category: "People", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "Legal" },
        { id: "A.6.7", title: "Remote working", category: "People", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.6.8", title: "Information security event reporting", category: "People", nistCsf: "DETECT", type: "DETECTIVE", owner: "SOC Team" },
        // A.7 Physical Controls
        { id: "A.7.1", title: "Physical security perimeters", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "Facilities" },
        { id: "A.7.2", title: "Physical entry controls", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "Facilities" },
        { id: "A.7.3", title: "Securing offices, rooms and facilities", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "Facilities" },
        { id: "A.7.4", title: "Physical security monitoring", category: "Physical", nistCsf: "DETECT", type: "DETECTIVE", owner: "Facilities" },
        { id: "A.7.5", title: "Protecting against physical and environmental threats", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "Facilities" },
        { id: "A.7.6", title: "Working in secure areas", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "Facilities" },
        { id: "A.7.7", title: "Clear desk and clear screen", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.7.8", title: "Equipment siting and protection", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.7.9", title: "Security of assets off-premises", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.7.10", title: "Storage media", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.7.11", title: "Supporting utilities", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "Facilities" },
        { id: "A.7.12", title: "Cabling security", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.7.13", title: "Equipment maintenance", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.7.14", title: "Secure disposal or reuse of equipment", category: "Physical", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        // A.8 Technological Controls
        { id: "A.8.1", title: "User endpoint devices", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.2", title: "Privileged access rights", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.3", title: "Information access restriction", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.4", title: "Access to source code", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.5", title: "Secure authentication", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.6", title: "Capacity management", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.8.7", title: "Protection against malware", category: "Technological", nistCsf: "PROTECT", type: "DETECTIVE", owner: "IT Security" },
        { id: "A.8.8", title: "Management of technical vulnerabilities", category: "Technological", nistCsf: "PROTECT", type: "CORRECTIVE", owner: "IT Security" },
        { id: "A.8.9", title: "Configuration management", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.8.10", title: "Information deletion", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.11", title: "Data masking", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.12", title: "Data leakage prevention", category: "Technological", nistCsf: "PROTECT", type: "DETECTIVE", owner: "IT Security" },
        { id: "A.8.13", title: "Information backup", category: "Technological", nistCsf: "RECOVER", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.8.14", title: "Redundancy of information processing facilities", category: "Technological", nistCsf: "RECOVER", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.8.15", title: "Logging", category: "Technological", nistCsf: "DETECT", type: "DETECTIVE", owner: "SOC Team" },
        { id: "A.8.16", title: "Monitoring activities", category: "Technological", nistCsf: "DETECT", type: "DETECTIVE", owner: "SOC Team" },
        { id: "A.8.17", title: "Clock synchronization", category: "Technological", nistCsf: "DETECT", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.8.18", title: "Use of privileged utility programs", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.19", title: "Installation of software on operational systems", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.20", title: "Network security", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.21", title: "Security of network services", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.22", title: "Segregation of networks", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.23", title: "Web filtering", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.24", title: "Use of cryptography", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.25", title: "Secure development life cycle", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.26", title: "Application security requirements", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.27", title: "Secure system architecture and engineering principles", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.28", title: "Secure coding", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.29", title: "Security testing in development and acceptance", category: "Technological", nistCsf: "PROTECT", type: "DETECTIVE", owner: "IT Security" },
        { id: "A.8.30", title: "Outsourced development", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.31", title: "Separation of development, test and production environments", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.8.32", title: "Change management", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Operations" },
        { id: "A.8.33", title: "Test information", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
        { id: "A.8.34", title: "Protection of information systems during audit testing", category: "Technological", nistCsf: "PROTECT", type: "PREVENTIVE", owner: "IT Security" },
    ];

    for (const ctrl of isoControls) {
        await prisma.complianceControl.upsert({
            where: { frameworkId_controlId: { frameworkId: iso27001.id, controlId: ctrl.id } },
            update: {},
            create: {
                controlId: ctrl.id,
                title: ctrl.title,
                category: ctrl.category,
                frameworkId: iso27001.id,
                controlType: ctrl.type as any,
                nistCsfFunction: ctrl.nistCsf as any,
                ownerRole: ctrl.owner,
                riskCategory: ctrl.nistCsf,
            },
        });
    }
    console.log(`✅ Created ${isoControls.length} ISO 27001:2022 controls`);

    // NRB Cyber Resilience Guidelines 2023
    const nrb = await prisma.complianceFramework.upsert({
        where: { id: "nrb-crg-2023" },
        update: {},
        create: {
            id: "nrb-crg-2023",
            name: "NRB Cyber Resilience Guidelines 2023",
            version: "2023",
            description: "Nepal Rastra Bank regulatory guidelines for cyber resilience in financial institutions",
            organizationId: org.id,
        },
    });

    const nrbControls = [
        { id: "NRB-GOV-01", title: "Board Approved Cyber Strategy", category: "Governance", nistCsf: "GOVERN" },
        { id: "NRB-GOV-02", title: "Cyber Resilience Framework", category: "Governance", nistCsf: "GOVERN" },
        { id: "NRB-GOV-03", title: "Role of Board and Senior Management", category: "Governance", nistCsf: "GOVERN" },
        { id: "NRB-ID-01", title: "Asset Identification and Classification", category: "Identification", nistCsf: "IDENTIFY" },
        { id: "NRB-ID-02", title: "Interconnections Mapping", category: "Identification", nistCsf: "IDENTIFY" },
        { id: "NRB-PROT-01", title: "Protection of Processes and Assets", category: "Protection", nistCsf: "PROTECT" },
        { id: "NRB-PROT-02", title: "Patch Management", category: "Protection", nistCsf: "PROTECT" },
        { id: "NRB-PROT-03", title: "Insider Threat Management", category: "Protection", nistCsf: "PROTECT" },
        { id: "NRB-PROT-04", title: "Security Awareness Training", category: "Protection", nistCsf: "PROTECT" },
        { id: "NRB-DET-01", title: "Cyber Attack Detection", category: "Detection", nistCsf: "DETECT" },
        { id: "NRB-DET-02", title: "Continuous Monitoring", category: "Detection", nistCsf: "DETECT" },
        { id: "NRB-RR-01", title: "Incident Response Planning", category: "Response & Recovery", nistCsf: "RESPOND" },
        { id: "NRB-RR-02", title: "Business Resumption and Recovery", category: "Response & Recovery", nistCsf: "RECOVER" },
        { id: "NRB-TEST-01", title: "Comprehensive Testing Program", category: "Testing", nistCsf: "IDENTIFY" },
        { id: "NRB-SA-01", title: "Cyber Threat Intelligence", category: "Situational Awareness", nistCsf: "DETECT" },
        { id: "NRB-SA-02", title: "Information Sharing", category: "Situational Awareness", nistCsf: "DETECT" },
        { id: "NRB-LE-01", title: "Ongoing Learning", category: "Learning & Evolving", nistCsf: "RECOVER" },
        { id: "NRB-LE-02", title: "Cyber Resilience Benchmarking", category: "Learning & Evolving", nistCsf: "GOVERN" },
    ];

    for (const ctrl of nrbControls) {
        await prisma.complianceControl.upsert({
            where: { frameworkId_controlId: { frameworkId: nrb.id, controlId: ctrl.id } },
            update: {},
            create: {
                controlId: ctrl.id,
                title: ctrl.title,
                category: ctrl.category,
                frameworkId: nrb.id,
                nistCsfFunction: ctrl.nistCsf as any,
                riskCategory: ctrl.nistCsf,
            },
        });
    }
    console.log(`✅ Created ${nrbControls.length} NRB Cyber Resilience controls`);

    console.log("🎉 Seeding completed!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
