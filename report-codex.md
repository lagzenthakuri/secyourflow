# SecYourFlow Security Audit and Remediation Report (`report-codex.md`)

## Scope
- Full repository audit and remediation across middleware, API authorization, tenant isolation, 2FA/session handling, webhook authenticity, evidence storage, secret-at-rest handling, audit attribution, signup policy, and dependency exposure.
- Validation included static checks, migration deployment, production build, and runtime API smoke checks.

## Policy Decisions Applied
- API exposure is secure-by-default.
- Public exceptions are explicitly limited to:
  - `/api/health`
  - signed webhook ingress `/api/webhooks/wazuh`
  - explicit automation routes with their own auth checks (`/api/admin/*`, `/api/compliance/assessments/run`, `/api/compliance/monitor`).
- Production registration is gated by invite/public-registration flags.
- Tenant isolation is enforced on scanner/scan/audit/risk snapshot domains through schema + route code.
- Test artifacts were removed after validation to satisfy production-hardening requirement.

## Vulnerability Inventory and Remediation

### VULN-01: Middleware bearer-header auth bypass
- Severity: Critical
- CWE: CWE-306, CWE-287
- Affected: `src/proxy.ts`
- Root cause: middleware accepted any non-empty bearer token.
- Remediation:
  - removed permissive bearer check.
  - enforced session auth for protected APIs.
  - moved to explicit allowlist for exempt routes only.
- Fixed by:
  - `src/proxy.ts`
- Verification:
  - `GET /api/dashboard` with `Authorization: Bearer fake-token` now returns `401`.
- Status: Fixed

### VULN-02: Unauthenticated compliance/scanner/scan/report APIs
- Severity: Critical
- CWE: CWE-862, CWE-285
- Affected:
  - `src/app/api/compliance/route.ts`
  - `src/app/api/compliance/[id]/route.ts`
  - `src/app/api/compliance/controls/route.ts`
  - `src/app/api/compliance/controls/[id]/route.ts`
  - `src/app/api/compliance/controls/[id]/evidence/route.ts`
  - `src/app/api/compliance/reports/[frameworkId]/route.ts`
  - `src/app/api/compliance/reports/[frameworkId]/pdf/route.ts`
  - `src/app/api/compliance/templates/route.ts`
  - `src/app/api/compliance/templates/import/route.ts`
  - `src/app/api/scanners/route.ts`
  - `src/app/api/scanners/[id]/route.ts`
  - `src/app/api/scans/route.ts`
  - `src/app/api/scans/run/route.ts`
- Root cause: missing route-level auth and inconsistent org/role checks.
- Remediation:
  - added `requireSessionWithOrg` across affected routes.
  - added role guards for mutation paths.
  - added org ownership checks before ID-based read/update/delete.
  - replaced broad mutable payload paths with Zod allowlists for updated routes.
- Fixed by:
  - `src/lib/api-auth.ts`
  - all listed API route files above
- Verification:
  - unauthenticated GET/POST/PATCH/DELETE to these route groups now return `401`.
  - scanner/compliance/reporting accesses are org-scoped in queries.
- Status: Fixed

### VULN-03: Dashboard global data leakage
- Severity: High
- CWE: CWE-200, CWE-359
- Affected: `src/app/api/dashboard/route.ts`
- Root cause: global aggregates, activity leakage, and unsafe cache policy.
- Remediation:
  - enforced `requireSessionWithOrg`.
  - scoped all dashboard aggregates by `organizationId`.
  - restricted activity feed to `MAIN_OFFICER` and org-scoped only.
  - set response cache policy to `private, no-store`.
- Fixed by:
  - `src/app/api/dashboard/route.ts`
- Verification:
  - unauthenticated call now `401`.
  - org filters present across count/group/trend/activity queries.
- Status: Fixed

### VULN-04: Public evidence file exposure
- Severity: High
- CWE: CWE-284, CWE-552
- Affected:
  - `src/lib/compliance-evidence-storage.ts`
  - `src/app/api/compliance/controls/[id]/evidence/route.ts`
- Root cause: files were stored under public web root and exposed by path.
- Remediation:
  - moved storage to private server path (`data/compliance-evidence`).
  - replaced raw path exposure with opaque authenticated download URL.
  - added org-scoped authenticated download endpoint.
- Fixed by:
  - `src/lib/compliance-evidence-storage.ts`
  - `src/app/api/compliance/controls/[id]/evidence/route.ts`
  - `src/app/api/compliance/evidence/versions/[versionId]/download/route.ts`
- Verification:
  - direct `/uploads/compliance-evidence/...` returns `404`.
  - downloads require auth + org check.
- Status: Fixed

### VULN-05: Unsigned webhook ingestion and payload logging
- Severity: High
- CWE: CWE-345, CWE-20, CWE-532
- Affected: `src/app/api/webhooks/wazuh/route.ts`
- Root cause: webhook accepted unsigned payloads and logged sensitive body data.
- Remediation:
  - implemented HMAC verification (`x-secyourflow-signature`, `x-secyourflow-timestamp`).
  - added 5-minute replay window.
  - removed raw payload logging.
  - required explicit org mapping (`orgId` query/header) with reject-on-miss.
- Fixed by:
  - `src/app/api/webhooks/wazuh/route.ts`
- Verification:
  - unsigned request returns `401`.
  - correctly signed request reaches org validation and returns `400` for invalid org (proves signature gate works).
- Status: Fixed

### VULN-06: 2FA freshness bypass due rolling timestamp mutation
- Severity: High
- CWE: CWE-613
- Affected: `src/lib/auth.ts`
- Root cause: token freshness fields could be rolled forward incorrectly.
- Remediation:
  - removed rolling mutation of sensitive auth timestamps.
  - preserved trusted-update-only path for 2FA state updates.
  - retained strict re-verification expiry enforcement.
- Fixed by:
  - `src/lib/auth.ts`
- Verification:
  - callbacks no longer unconditionally refresh `twoFactorVerifiedAt`.
  - `requireSessionWithOrg` enforces 2FA satisfaction.
- Status: Fixed

### VULN-07: Cross-tenant “first organization” fallback patterns
- Severity: High
- CWE: CWE-639
- Affected:
  - `src/lib/api-auth.ts`
  - `src/lib/auth.ts`
  - `src/app/api/auth/register/route.ts`
  - `src/modules/threat-intel/auth.ts`
  - `src/modules/threat-intel/persistence/repository.ts`
  - `src/app/api/risk-register/generate/route.ts`
- Root cause: request-time auto assignment/fallback to first org.
- Remediation:
  - removed request-time fallback assignment.
  - hard-fail on missing org context (403).
  - token-based threat-intel now requires explicit org header.
  - register path now requires configured registration org ID; no implicit first-org assignment.
- Fixed by:
  - files listed above
- Verification:
  - missing org context now fails instead of auto-joining.
- Status: Fixed

### VULN-08: Notification target abuse
- Severity: Medium
- CWE: CWE-639
- Affected: `src/app/api/notifications/route.ts`
- Root cause: arbitrary `userId` targeting without strict guard.
- Remediation:
  - non-main-officers can only notify self.
  - `MAIN_OFFICER` can target only users in same organization.
  - added payload schema validation and org-target existence check.
- Fixed by:
  - `src/app/api/notifications/route.ts`
- Verification:
  - unauthenticated mutation denied (`401`).
  - target validation implemented in route logic.
- Status: Fixed

### VULN-09: Audit attribution fallback to hardcoded admin
- Severity: Medium
- CWE: CWE-778
- Affected: `src/lib/logger.ts`
- Root cause: fallback attribution to hardcoded privileged identity.
- Remediation:
  - removed hardcoded fallback user.
  - now skips unattributable logs safely.
  - requires resolved `organizationId` and writes org-scoped audit entries.
- Fixed by:
  - `src/lib/logger.ts`
  - `prisma/schema.prisma` (`AuditLog.organizationId`)
  - `prisma/migrations/20260214150000_operational_org_isolation/migration.sql`
- Verification:
  - logger now resolves actor/org or refuses write.
- Status: Fixed

### VULN-10: Vulnerable `xlsx` dependency
- Severity: High
- CWE: CWE-1321, CWE-1333
- Affected:
  - `package.json`
  - `next.config.ts`
  - `src/lib/reporting/renderers/xlsx.ts`
  - reporting/export callers
- Root cause: known advisories in `xlsx`.
- Remediation:
  - removed `xlsx`.
  - migrated XLSX rendering to `exceljs`.
  - updated renderers and async export flow.
- Fixed by:
  - `package.json`
  - `package-lock.json`
  - `next.config.ts`
  - `src/lib/reporting/renderers/xlsx.ts`
  - `src/lib/reporting/export-utils.ts`
  - `src/lib/reporting/engine.ts`
  - `src/app/api/exports/assets/route.ts`
  - `src/app/api/exports/vulnerabilities/route.ts`
  - `src/app/api/exports/compliance/route.ts`
- Verification:
  - `npm audit --omit=dev` reports `found 0 vulnerabilities`.
- Status: Fixed

### VULN-11: Public registration policy risk
- Severity: Medium
- CWE: CWE-306
- Affected: `src/app/api/auth/register/route.ts`
- Root cause: unrestricted registration path with implicit org assignment.
- Remediation:
  - production gate: `ENABLE_PUBLIC_REGISTRATION` or valid invite token.
  - registration requires configured `REGISTRATION_DEFAULT_ORGANIZATION_ID`.
  - removed first-org fallback.
- Fixed by:
  - `src/app/api/auth/register/route.ts`
- Verification:
  - production-mode registration request without invite token returns `403`.
- Status: Fixed

## Additional Hardening Implemented
- Added strict route-level auth to CVE and risk-calculation APIs:
  - `src/app/api/cves/search/route.ts`
  - `src/app/api/cves/[cveId]/route.ts`
  - `src/app/api/risk/calculate/route.ts`
- Added secure secret envelope encryption/decryption helper:
  - `src/lib/crypto/sealed-secrets.ts`
- Encrypted scanner/feed credentials at rest; redacted in responses:
  - `src/app/api/scanners/route.ts`
  - `src/app/api/threats/feeds/route.ts`
  - `src/lib/scanner-engine.ts`
  - `src/modules/threat-intel/orchestrator.ts`

## Tenant-Isolation Schema Migration
- Added organization ownership fields and relations:
  - `AuditLog.organizationId`
  - `ScannerConfig.organizationId`
  - `ScanResult.organizationId`
  - `RiskSnapshot.organizationId`
- Updated model relations/indexes in `prisma/schema.prisma`.
- Added migration with deterministic backfill and idempotent DDL:
  - `prisma/migrations/20260214150000_operational_org_isolation/migration.sql`
- Applied migration to target database:
  - `npx prisma migrate deploy` succeeded after resolving prior failed-attempt state.

## Verification Evidence

### Static/Build/Dependency
- `npm run typecheck` -> pass
- `npm run lint` -> pass with 11 pre-existing warnings (no errors)
- `npm run build` -> pass
- `npm audit --omit=dev` -> `found 0 vulnerabilities`

### Migration
- `npx prisma migrate deploy` -> migration `20260214150000_operational_org_isolation` applied successfully

### Runtime API Smoke (server started via `npm run start`)
- Public/exempt checks:
  - `GET /api/health` -> `503` (DB health degradation in this environment)
  - `POST /api/admin/ingest` -> `401`
  - `POST /api/admin/threat-intel/sync` -> `401`
  - `POST /api/compliance/assessments/run` -> `401`
  - `POST /api/compliance/monitor` -> `401`
  - `POST /api/webhooks/wazuh` unsigned -> `401`
  - `POST /api/webhooks/wazuh` signed invalid org -> `400`
  - `POST /api/auth/register` valid payload without invite -> `403`
- Protected route checks (unauthenticated): representative GET/POST/PATCH/DELETE calls across dashboard, activity, assets, scanners, scans, compliance, threats, users, vulnerabilities, reports, risk register all returned `401`.
- Bearer bypass check:
  - `GET /api/dashboard` with fake bearer token -> `401`

## Test Artifact Removal (Requested)
- Removed test files/tooling:
  - deleted `vitest.config.ts`
  - deleted `vitest.setup.ts`
  - removed `vitest` from `devDependencies`
  - removed `test` script from `package.json`

## Post-Removal Validation
- `npm run typecheck` -> pass
- `npm run lint` -> pass with existing warnings
- `npm run build` -> pass
- `npm audit --omit=dev` -> `found 0 vulnerabilities`

## Residual Risks / Notes
- Existing frontend lint warnings remain (non-security, pre-existing).
- During local `next start`, Auth.js logged `UntrustedHost` for `/api/auth/session` requests in this environment; set trusted-host auth env config in deployment to suppress/resolve.
