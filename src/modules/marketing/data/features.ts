export type MarketingFeature = {
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  eyebrow: string;
  headline: string;
  description: string;
  workflow: string[];
  screenshots: { src: string; alt: string; caption: string; width: number; height: number }[];
  related: string[];
};

export const marketingFeatures: MarketingFeature[] = [
  {
    slug: "assets",
    title: "Asset inventory",
    shortTitle: "Assets",
    summary: "Keep ownership and environment details with each asset, then search and filter the inventory.",
    eyebrow: "Asset operations",
    headline: "Know what is in scope and who owns it.",
    description: "Create records for servers, endpoints, cloud resources, and other assets. Keep type, environment, criticality, owner, location, network, and cloud details together. Use list or map views and narrow the inventory by the fields your team uses.",
    workflow: ["Record asset context and ownership.", "Filter by type, status, criticality, tags, or group.", "Connect findings to the asset they affect."],
    screenshots: [{ src: "/screenshots/asset-inventory.png", alt: "Asset inventory search, filters, and list or map controls.", caption: "Inventory filters and list/map switch", width: 1785, height: 145 }],
    related: ["vulnerabilities", "risk-compliance"],
  },
  {
    slug: "vulnerabilities",
    title: "Vulnerability management",
    shortTitle: "Vulnerabilities",
    summary: "Track severity, status, ownership, affected assets, and due dates for findings.",
    eyebrow: "Exposure management",
    headline: "Move findings into owned remediation work.",
    description: "Create or import vulnerability findings, record their CVE and severity, connect affected assets, assign a person or team, and track workflow state and SLA due dates. The finding record keeps description and remediation guidance beside its status.",
    workflow: ["Capture or import a finding.", "Link affected assets and assign an owner.", "Track its workflow status and due date."],
    screenshots: [{ src: "/screenshots/vulnerability-form.png", alt: "Vulnerability form with title, severity, status, asset, owner, due date, description, and remediation fields.", caption: "Finding details and ownership fields", width: 511, height: 790 }],
    related: ["assets", "cve-search", "remediation"],
  },
  {
    slug: "cve-search",
    title: "CVE search",
    shortTitle: "CVE search",
    summary: "Search public vulnerability records and CISA KEV entries, then inspect affected products and versions.",
    eyebrow: "Public vulnerability data",
    headline: "Check the record and the affected versions.",
    description: "Search by CVE ID, vendor, product, or keyword. Filter and sort the results, review CVSS and CISA KEV status, then open a record to compare affected vendor, product, and version entries with your inventory.",
    workflow: ["Search by CVE, vendor, product, or keyword.", "Filter public records by severity, year, and KEV status.", "Open a CVE to inspect affected product and version entries."],
    screenshots: [
      { src: "/screenshots/cve-search-workspace.png", alt: "CISA Known Exploited Vulnerabilities results in the CVE search table with CVE, product, CVSS, and date columns.", caption: "CVE search filters and CISA KEV results", width: 1280, height: 670 },
      { src: "/screenshots/cve-affected-products.png", alt: "CVE record table showing affected vendor, product, version, update, and CPE entry counts.", caption: "Affected products and version entries on a CVE record", width: 785, height: 245 },
    ],
    related: ["vulnerabilities", "threat-intelligence"],
  },
  {
    slug: "remediation",
    title: "Remediation plans",
    shortTitle: "Remediation",
    summary: "Coordinate vulnerability fixes with owners, plan status, deadlines, and verification evidence.",
    eyebrow: "Vulnerability response",
    headline: "Give each fix an owner and a way to verify it.",
    description: "Create remediation plans for vulnerability work, then track active, blocked, and completed plans. Search by plan, owner, or vulnerability and keep verification evidence with the work item.",
    workflow: ["Create a plan for the vulnerability work.", "Assign responsibility and track status.", "Record verification evidence when the fix is complete."],
    screenshots: [{ src: "/screenshots/remediation-plans.png", alt: "Remediation plans heading and controls for refreshing the plan list or creating a new plan.", caption: "Remediation plan workspace", width: 1535, height: 160 }],
    related: ["vulnerabilities", "assets"],
  },
  {
    slug: "threat-intelligence",
    title: "Threat intelligence",
    shortTitle: "Threat intelligence",
    summary: "Review CISA KEV context, indicators, ATT&CK views, and matched assets in the threat workspace.",
    eyebrow: "Threat context",
    headline: "Review external signals alongside internal findings.",
    description: "The threat workspace brings exploited-vulnerability context, feeds, indicators, matched assets, actor profiles, and an ATT&CK matrix into one view. Use it to inspect signals and correlate them with the assets and findings your team tracks.",
    workflow: ["Review exploited vulnerability and feed activity.", "Inspect indicators and ATT&CK context.", "Run correlation against tracked assets."],
    screenshots: [{ src: "/screenshots/threat-intelligence.png", alt: "Threat intelligence workspace title, refresh and correlation actions, and overview tabs for ATT&CK, IOC, and actors.", caption: "Threat workspace navigation and correlation actions", width: 1602, height: 140 }],
    related: ["cve-search", "assets", "vulnerabilities"],
  },
  {
    slug: "risk-compliance",
    title: "Risk and compliance",
    shortTitle: "Risk & compliance",
    summary: "Connect risk records, policies, framework controls, evidence, and NIS2 checklist work.",
    eyebrow: "Governance workflows",
    headline: "Keep risk decisions and control work connected.",
    description: "Maintain a risk register and appetite statements, manage policy review stages, and track framework controls and evidence. NIS2 governance provides a checklist organized around the directive’s risk-management sub-paragraphs, with ownership and implementation status.",
    workflow: ["Record and assign risk treatment decisions.", "Manage policy and framework control status.", "Track NIS2 measures, owners, and due dates."],
    screenshots: [{ src: "/screenshots/nis2-governance.png", alt: "NIS2 Governance page showing coverage by directive sub-paragraph and checklist controls with verification, owner, and status fields.", caption: "NIS2 control coverage and checklist", width: 1655, height: 390 }],
    related: ["assets", "vulnerabilities", "remediation"],
  },
  {
    slug: "ai-assistance",
    title: "AI assistance",
    shortTitle: "AI assistance",
    summary: "Use AI for risk assessment and field suggestions with redaction and human-review controls.",
    eyebrow: "AI in SecYourFlow",
    headline: "AI assists specific steps; your team keeps the decision.",
    description: "AI can run a risk assessment when a vulnerability is linked to an asset, suggest risk-register fields from a threat and CIA impacts, and support compliance analysis. Administrators can enable AI Assist, require human review before generated content is accepted, and set data-redaction rules.",
    workflow: ["Enable the AI features the workspace allows.", "Use assessment or field suggestions within the relevant workflow.", "Review generated content before accepting it."],
    screenshots: [
      { src: "/screenshots/vulnerability-ai-assessment.png", alt: "Vulnerability form showing that linking an affected asset triggers an AI-powered risk assessment.", caption: "Asset-linked risk assessment", width: 455, height: 112 },
      { src: "/screenshots/ai-assist-controls.png", alt: "AI Assist settings showing enablement, Risk Register Autofill, required human review, and data-redaction controls.", caption: "Workspace controls for AI use and review", width: 1175, height: 430 },
    ],
    related: ["vulnerabilities", "risk-compliance"],
  },
];

export function getMarketingFeature(slug: string) {
  return marketingFeatures.find((feature) => feature.slug === slug);
}
