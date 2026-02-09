# SecYourFlow

SecYourFlow consolidates security posture signals from scanners, CVE feeds, and compliance frameworks into a single platform so teams can quickly answer:

* What assets are exposed and most critical?
* What vulnerabilities are actively exploited and should be prioritized now?
* Which compliance controls are impacted (ISO 27001, NIST, PCI, etc.)?
* What actions reduce business risk fastest?

---

## Core Capabilities

### 1. Asset Inventory

* Centralized inventory for servers, applications, domains, and cloud resources
* Asset criticality scoring and exposure classification
* Environment tagging (production, staging, internal, etc.)

### 2. Vulnerability Management

* Import findings from scanners such as Nessus, OpenVAS, Nmap, and Trivy
* Normalize scanner outputs into a unified vulnerability model
* De-duplicate and track remediation lifecycle

### 3. Threat Context

CVE enrichment including:

* EPSS exploit probability
* Known exploited vulnerability indicators (e.g., CISA KEV)
* Source references and publication timelines

### 4. Risk Scoring

Composite risk scoring based on:

* CVSS severity
* Asset criticality
* Exposure context
* Threat signals (EPSS, KEV, exploitation status)

### 5. Compliance Mapping

* Map vulnerabilities and risks to compliance frameworks:

  * ISO 27001
  * NIST
  * PCI DSS
* Identify control coverage gaps
* Generate audit-ready compliance reporting

### 6. Executive Dashboard

* Clear visibility into exposed, exploited, and non-compliant assets
* Risk trend analysis
* Prioritized remediation views
* Business-focused reporting

---

## Tech Stack

### Frontend

* Next.js + React + TypeScript
* TailwindCSS (or internal component system)
* Recharts or Chart.js
* Fully responsive (desktop + mobile)

### Backend

* Next.js API routes
* REST-style APIs
* Authentication: NextAuth.js (JWT strategy) + RBAC

### Database and Cache

* PostgreSQL (system of record) + Prisma ORM
* Redis (optional: caching and computed risk scoring)

### Security Data Sources

* NVD CVE feeds
* EPSS
* CISA KEV
* MITRE CVE Program API
* Scanner JSON imports and manual findings

---

## Getting Started

### Prerequisites

* Node.js 20+
* PostgreSQL
* Optional: Redis

### Setup

1. Clone the repository

```bash
git clone <repository-url>
cd secyourflow
```

2. Install dependencies

```bash
npm install
```

3. Create environment file

```bash
cp .env.example .env.local
```

4. Configure `.env.local` (see Environment Variables section)

5. Generate Prisma client

```bash
npx prisma generate
```

6. Apply database migrations

```bash
npx prisma migrate deploy
```

7. Optional: Seed database

```bash
npx prisma db seed
```

8. Start development server

```bash
npm run dev
```

Application runs at:
[http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Minimum required:

* AUTH_SECRET
* NEXTAUTH_URL
* DATABASE_URL
* TOTP_ENCRYPTION_KEY

Optional:

* REDIS_URL
* REAL_API_TESTS

Testing mode:

```env
REAL_API_TESTS=false
```

---

## Security Architecture

* Authentication: NextAuth.js (JWT strategy)
* Role-Based Access Control (RBAC)

Example roles:

* IT_OFFICER — asset and infrastructure management
* PENTESTER — vulnerability assessment and testing
* ANALYST — risk analysis and reporting
* MAIN_OFFICER — executive oversight

Additional controls:

* 2FA/TOTP with encrypted secrets at rest
* Audit logging for critical actions
* Secure secret handling (no secrets in repository)

---

## Testing

Run unit and integration tests:

```bash
npm test
```

Run integration tests against real APIs:

```bash
REAL_API_TESTS=true npm test
```

---

## Deployment

### Build

```bash
npm run build
```

### Apply Migrations

```bash
npx prisma migrate deploy
```

### Start Production Server

```bash
npm start
```

### Maintained By SHYENA

Private and proprietary. All rights reserved.
