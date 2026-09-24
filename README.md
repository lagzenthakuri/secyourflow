<div align="center">

# SecYourFlow

**Unified Security Posture Management Platform**

Consolidate security signals from scanners, CVE feeds, and compliance frameworks into actionable intelligence

---

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

</div>

---

## What is SecYourFlow?

SecYourFlow empowers security teams to make data-driven decisions by providing clear answers to critical questions:

```
→ What assets are exposed and most critical?
→ Which vulnerabilities are actively exploited and require immediate attention?
→ How do current risks affect compliance frameworks (ISO 27001, NIST, PCI DSS)?
→ What actions will reduce business risk most effectively?
```

---

## Key Features

### Asset Inventory
Centralized inventory management for comprehensive asset visibility across your infrastructure.

- Servers, applications, domains, and cloud resources
- Asset criticality scoring and exposure classification
- Environment tagging (production, staging, internal)

### Vulnerability Management
Unified vulnerability tracking across multiple security scanners.

- Import from Nessus, OpenVAS, Nmap, Trivy, and more
- Normalized vulnerability model for consistent analysis
- De-duplication and remediation lifecycle tracking

### Threat Intelligence
Real-time CVE enrichment with actionable threat context.

- EPSS exploit probability scoring
- CISA KEV integration for known exploited vulnerabilities
- Source references and publication timelines

### Risk Scoring
Intelligent composite risk assessment based on multiple factors.

- CVSS severity analysis
- Asset criticality weighting
- Exposure context evaluation
- Threat signal integration (EPSS, KEV, exploitation status)

### Compliance Mapping
Framework alignment and automated gap analysis.

- ISO 27001, NIST, PCI DSS support
- Automated control coverage mapping
- Audit-ready compliance reporting

### Executive Dashboard
Business-focused security insights for leadership.

- Real-time exposure and exploitation visibility
- Risk trend analysis and forecasting
- Prioritized remediation recommendations

---

## Technology Stack

**Frontend**
- Next.js 15 with React 19
- TypeScript for type safety
- TailwindCSS for styling
- Recharts for data visualization
- Fully responsive design

**Backend**
- Next.js API Routes
- RESTful API architecture
- NextAuth.js with JWT authentication
- Role-Based Access Control (RBAC)
- Comprehensive audit logging

**Data Layer**
- PostgreSQL 16 as primary database
- Prisma ORM for type-safe queries
- Redis for caching and performance
- Real-time data synchronization

**Security Data Sources**
- NVD CVE Feeds
- EPSS (Exploit Prediction Scoring System)
- CISA KEV (Known Exploited Vulnerabilities)
- MITRE CVE Program API
- Scanner integrations (JSON import + manual findings)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 20 or higher
- PostgreSQL 16 or higher
- Redis (optional, recommended for production)

### Installation

Clone the repository:

```bash
git clone <repository-url>
cd secyourflow
```

Install dependencies:

```bash
npm install
```

Configure environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration settings.

Initialize the database:

```bash
# Generate Prisma client
npx prisma generate

# Apply database migrations
npx prisma migrate deploy

# Seed database with initial data (optional)
npx prisma db seed
```

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`

---

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Secret key for JWT token signing |
| `NEXTAUTH_URL` | Application URL (e.g., http://localhost:3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `TOTP_ENCRYPTION_KEY` | Encryption key for 2FA secrets |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string for caching and distributed rate limiting | - |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | - |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | - |
| `ALLOW_PUBLIC_REGISTRATION` | Enable public email/password registration | `false` |
| `REAL_API_TESTS` | Enable real API testing | `false` |

### Example Configuration

```env
AUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/secyourflow
TOTP_ENCRYPTION_KEY=your-encryption-key-here
REDIS_URL=redis://localhost:6379
REAL_API_TESTS=false
```

---

## Security Architecture

SecYourFlow implements enterprise-grade security controls to protect your data and operations.

### Authentication & Authorization

- NextAuth.js with JWT strategy
- Role-Based Access Control (RBAC) with granular permissions
- Two-Factor Authentication (2FA/TOTP) with encrypted secrets at rest

### Access Roles

| Role | Description |
|------|-------------|
| `MAIN_OFFICER` | Executive oversight with full system access |
| `IT_OFFICER` | Asset and infrastructure management |
| `PENTESTER` | Vulnerability assessment and penetration testing |
| `ANALYST` | Risk analysis and security reporting |

### Security Controls

- Comprehensive audit logging for all critical actions
- Secure secret handling (no credentials stored in repository)
- Session management with automatic expiration
- Input validation and sanitization across all endpoints
- SQL injection prevention via Prisma ORM

---

## Testing

Run the complete test suite:

```bash
npm test
```

Run integration tests with real API endpoints:

```bash
REAL_API_TESTS=true npm test
```

---

## Deployment

### Vercel / Serverless Deployment

Vercel functions cannot access a database running on your laptop, inside Docker,
or on a private network. Configure a Vercel-accessible PostgreSQL provider and
use its **pooled** connection string for the runtime `DATABASE_URL`. When the
provider requires a direct connection for DDL, run migrations with its direct
(non-pooled) URL instead.

Required production environment variables:

```env
DATABASE_URL=postgresql://...pooler-host.../secyourflow?sslmode=verify-full
AUTH_SECRET=<long-random-secret>
NEXTAUTH_URL=https://secyourflow.vercel.app
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
# Optional: set to true only when public email/password registration is intended.
ALLOW_PUBLIC_REGISTRATION=true
DB_POOL_MAX=1
DB_CONNECT_TIMEOUT_MS=5000
```

`sslmode=verify-full` verifies both the database certificate and its hostname.
If a provider uses a certificate that is not trusted by Node, configure its CA
with `sslrootcert` instead. Use `uselibpqcompat=true&sslmode=require` only when
that provider explicitly requires libpq's weaker certificate semantics.

Also configure these trusted URLs in Google Cloud Console:

```text
https://secyourflow.vercel.app/api/auth/callback/google
```

Apply migrations to the hosted database before enabling the Vercel deployment.
`prisma generate` only generates the client; it does not create database tables.

```bash
DATABASE_URL='<hosted-direct-database-url>' npx prisma migrate deploy
```

If `migrate deploy` returns `P3005`, the database is non-empty but was not
initialized by Prisma Migrate. Do not run `migrate reset` against a database
that contains users or other production data. Back it up and perform a
reviewed one-time baseline/schema reconciliation, or provision a fresh hosted
database and apply all migrations there. The Auth.js `Account` table must exist
before enabling sign-in. Legacy `SUPER_ADMIN` rows are normalized to
`MAIN_OFFICER` by the compatibility migration because the current role model
uses the four supported administrative/security roles.

`GET /api/health` returns `503` when PostgreSQL or the required application
schema is unavailable. A healthy
authentication deployment returns `200`; optional CVE feed failures are
reported as `degraded` without taking login offline.

### Standard Deployment

Build the application for production:

```bash
npm run build
```

Apply database migrations:

```bash
npx prisma migrate deploy
```

Start the production server:

```bash
npm start
```

### Docker Deployment

Ensure Docker and Docker Compose are installed on your system.

Configure your `.env` file with the required variables. The `docker-compose.yml` automatically configures database and Redis connections for containerized services.

Build and start all services:

```bash
docker-compose up --build -d
```

Initialize the database:

```bash
# Apply migrations
docker-compose run --rm web npx prisma migrate deploy

# Seed database (optional)
docker-compose run --rm web npx prisma db seed
```

Access the application at `http://localhost:3000`

Stop all services:

```bash
docker-compose down
```

---

## Project Structure

```
secyourflow/
├── prisma/              # Database schema and migrations
├── public/              # Static assets
├── src/
│   ├── app/            # Next.js app directory
│   ├── components/     # React components
│   ├── lib/            # Utility functions and helpers
│   └── types/          # TypeScript type definitions
├── .env.example        # Environment variable template
├── docker-compose.yml  # Docker configuration
└── package.json        # Project dependencies
```

---

## Contributing

This is a private and proprietary project. Contributions are limited to authorized team members only.

---

<div align="center">

**Maintained by SHYENA**

*Private and proprietary. All rights reserved.*

---

Built with precision for security professionals

</div>
