# Product Overview

SecYourFlow is a comprehensive security posture management platform that consolidates vulnerability data, threat intelligence, and compliance frameworks into a unified dashboard.

## Core Purpose

Help security teams answer critical questions:
- What assets are exposed and most critical?
- What vulnerabilities are actively exploited and should be prioritized?
- Which compliance controls are impacted?
- What actions reduce business risk fastest?

## Key Features

- **Asset Inventory**: Centralized tracking of servers, applications, domains, and cloud resources with criticality scoring
- **Vulnerability Management**: Import and normalize findings from multiple scanners (Nessus, OpenVAS, Nmap, Trivy)
- **Threat Intelligence**: CVE enrichment with EPSS scores, CISA KEV indicators, and exploitation status
- **Risk Scoring**: Composite risk calculation based on CVSS, asset criticality, exposure context, and threat signals
- **Compliance Mapping**: Map vulnerabilities to ISO 27001, NIST CSF, PCI DSS, and SOC2 frameworks
- **Executive Dashboard**: Business-focused reporting with risk trends and prioritized remediation views

## User Roles

- **IT_OFFICER**: Asset and infrastructure management
- **PENTESTER**: Vulnerability assessment and testing
- **ANALYST**: Risk analysis and reporting
- **MAIN_OFFICER**: Executive oversight

## Security Features

- NextAuth.js authentication with JWT strategy
- Role-Based Access Control (RBAC)
- 2FA/TOTP with encrypted secrets
- Single active session enforcement
- Comprehensive audit logging
