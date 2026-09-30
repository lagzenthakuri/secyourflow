/**
 * Shared test fixtures for SecYourFlow test suite.
 *
 * All data is deterministic and uses clearly fake values.
 * No real credentials, API keys, or production data.
 */

import type { Severity, WorkflowState, AssetType, Environment, Criticality, AssetStatus, CloudProvider, Role } from "@prisma/client";

// ─── Organizations ───────────────────────────────────────────────────────────

export const orgA = {
  id: "org-a-test-001",
  name: "Test Organization Alpha",
  domain: "alpha-test.example.com",
};

export const orgB = {
  id: "org-b-test-002",
  name: "Test Organization Beta",
  domain: "beta-test.example.com",
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = {
  mainOfficerA: {
    id: "user-main-a-001",
    email: "main.officer@alpha-test.example.com",
    name: "Main Officer Alpha",
    role: "MAIN_OFFICER" as Role,
    organizationId: orgA.id,
    password: "TestPassword123!",
  },
  itOfficerA: {
    id: "user-it-a-001",
    email: "it.officer@alpha-test.example.com",
    name: "IT Officer Alpha",
    role: "IT_OFFICER" as Role,
    organizationId: orgA.id,
    password: "TestPassword123!",
  },
  pentesterA: {
    id: "user-pentest-a-001",
    email: "pentester@alpha-test.example.com",
    name: "Pentester Alpha",
    role: "PENTESTER" as Role,
    organizationId: orgA.id,
    password: "TestPassword123!",
  },
  analystA: {
    id: "user-analyst-a-001",
    email: "analyst@alpha-test.example.com",
    name: "Analyst Alpha",
    role: "ANALYST" as Role,
    organizationId: orgA.id,
    password: "TestPassword123!",
  },
  mainOfficerB: {
    id: "user-main-b-001",
    email: "main.officer@beta-test.example.com",
    name: "Main Officer Beta",
    role: "MAIN_OFFICER" as Role,
    organizationId: orgB.id,
    password: "TestPassword123!",
  },
  itOfficerB: {
    id: "user-it-b-001",
    email: "it.officer@beta-test.example.com",
    name: "IT Officer Beta",
    role: "IT_OFFICER" as Role,
    organizationId: orgB.id,
    password: "TestPassword123!",
  },
  analystB: {
    id: "user-analyst-b-001",
    email: "analyst@beta-test.example.com",
    name: "Analyst Beta",
    role: "ANALYST" as Role,
    organizationId: orgB.id,
    password: "TestPassword123!",
  },
};

// ─── Assets ──────────────────────────────────────────────────────────────────

export const assets = {
  webServerA: {
    id: "asset-web-a-001",
    name: "web-server-alpha-01",
    type: "SERVER" as AssetType,
    hostname: "web-01.alpha-test.example.com",
    ipAddress: "10.0.1.10",
    operatingSystem: "Ubuntu 22.04",
    environment: "PRODUCTION" as Environment,
    criticality: "HIGH" as Criticality,
    status: "ACTIVE" as AssetStatus,
    owner: "IT Officer Alpha",
    department: "Engineering",
    organizationId: orgA.id,
  },
  databaseA: {
    id: "asset-db-a-001",
    name: "db-server-alpha-01",
    type: "DATABASE" as AssetType,
    hostname: "db-01.alpha-test.example.com",
    ipAddress: "10.0.1.20",
    operatingSystem: "PostgreSQL 15",
    environment: "PRODUCTION" as Environment,
    criticality: "CRITICAL" as Criticality,
    status: "ACTIVE" as AssetStatus,
    owner: "IT Officer Alpha",
    department: "Engineering",
    organizationId: orgA.id,
  },
  webServerB: {
    id: "asset-web-b-001",
    name: "web-server-beta-01",
    type: "SERVER" as AssetType,
    hostname: "web-01.beta-test.example.com",
    ipAddress: "10.0.2.10",
    operatingSystem: "Ubuntu 22.04",
    environment: "PRODUCTION" as Environment,
    criticality: "MEDIUM" as Criticality,
    status: "ACTIVE" as AssetStatus,
    owner: "IT Officer Beta",
    department: "Engineering",
    organizationId: orgB.id,
  },
};

// ─── Vulnerabilities ─────────────────────────────────────────────────────────

export const vulnerabilities = {
  criticalSqlInjection: {
    id: "vuln-sql-001",
    cveId: "CVE-2024-1234",
    title: "SQL Injection in login form",
    description: "A critical SQL injection vulnerability allows unauthorized database access.",
    severity: "CRITICAL" as Severity,
    cvssScore: 9.8,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    epssScore: 0.95,
    cisaKev: true,
    isExploited: true,
    source: "manual",
    status: "NEW" as WorkflowState,
    organizationId: orgA.id,
  },
  highXss: {
    id: "vuln-xss-001",
    cveId: "CVE-2024-5678",
    title: "Cross-Site Scripting in search",
    description: "Reflected XSS in the search parameter.",
    severity: "HIGH" as Severity,
    cvssScore: 7.5,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
    epssScore: 0.45,
    cisaKev: false,
    isExploited: false,
    source: "scanner",
    status: "TRIAGED" as WorkflowState,
    organizationId: orgA.id,
  },
  mediumInfo: {
    id: "vuln-info-001",
    cveId: "CVE-2024-9999",
    title: "Information disclosure in headers",
    description: "Server version exposed in HTTP headers.",
    severity: "MEDIUM" as Severity,
    cvssScore: 5.3,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    epssScore: 0.12,
    cisaKev: false,
    isExploited: false,
    source: "scanner",
    status: "NEW" as WorkflowState,
    organizationId: orgB.id,
  },
  lowSsl: {
    id: "vuln-ssl-001",
    cveId: "CVE-2024-0001",
    title: "Weak SSL/TLS configuration",
    description: "Server supports TLS 1.0.",
    severity: "LOW" as Severity,
    cvssScore: 3.7,
    cvssVector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N",
    epssScore: 0.05,
    cisaKev: false,
    isExploited: false,
    source: "scanner",
    status: "NEW" as WorkflowState,
    organizationId: orgB.id,
  },
};

// ─── Invitations ─────────────────────────────────────────────────────────────

export const invitations = {
  valid: {
    id: "inv-test-001",
    email: "invited@alpha-test.example.com",
    role: "ANALYST" as Role,
    organizationId: orgA.id,
    token: "aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890AbCd",
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    usedAt: null,
  },
  expired: {
    id: "inv-test-002",
    email: "expired@alpha-test.example.com",
    role: "ANALYST" as Role,
    organizationId: orgA.id,
    token: "xYzAbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbC",
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    usedAt: null,
  },
  used: {
    id: "inv-test-003",
    email: "used@alpha-test.example.com",
    role: "ANALYST" as Role,
    organizationId: orgA.id,
    token: "MnOpQrStUvWxYzAbCdEfGhIjKl1234567890AbCdEf",
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    usedAt: new Date(),
  },
};

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = {
  validMainOfficerA: {
    user: {
      id: users.mainOfficerA.id,
      email: users.mainOfficerA.email,
      name: users.mainOfficerA.name,
      role: users.mainOfficerA.role,
      organizationId: orgA.id,
      totpEnabled: false,
    },
    expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  validAnalystB: {
    user: {
      id: users.analystB.id,
      email: users.analystB.email,
      name: users.analystB.name,
      role: users.analystB.role,
      organizationId: orgB.id,
      totpEnabled: false,
    },
    expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  expired: {
    user: {
      id: users.mainOfficerA.id,
      email: users.mainOfficerA.email,
      name: users.mainOfficerA.name,
      role: users.mainOfficerA.role,
      organizationId: orgA.id,
      totpEnabled: false,
    },
    expires: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

// ─── CVSS Test Vectors ───────────────────────────────────────────────────────

export const cvssVectors = {
  allHigh: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
  allLow: "CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:L/A:L",
  allNone: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
  mixed: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N",
  network: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
  adjacent: "CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
  local: "CVSS:3.1/AV:L/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
  physical: "CVSS:3.1/AV:P/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
};

// ─── Rate Limit Keys ─────────────────────────────────────────────────────────

export const rateLimitKeys = {
  ip: "192.0.2.10",
  email: "test@example.com",
  action: "credentials",
};
