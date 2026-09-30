# SecYourFlow Testing Guide

## Overview

This document describes the testing infrastructure for SecYourFlow, a comprehensive GRC (Governance, Risk, Compliance) platform.

## Test Architecture

```
tests/
├── helpers/
│   ├── test-fixtures.ts      # Shared test data (users, orgs, assets, etc.)
│   └── test-utils.ts         # Shared test utilities
├── unit/
│   ├── auth/                 # Authentication tests
│   ├── authorization/        # RBAC tests
│   ├── validation/           # Input validation tests
│   ├── risk/                 # Risk calculation tests
│   ├── security/             # Security tests (rate limiting, headers, etc.)
│   └── components/           # React component tests
├── integration/
│   ├── api/                  # API integration tests
│   └── database/             # Database/Prisma tests
└── e2e/
    └── auth/                 # End-to-end authentication tests
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage
```

### Security Tests

```bash
# Run only security tests
bun run test:security
```

### Integration Tests

```bash
# Run integration tests (requires test database)
bun run test:integration
```

### E2E Tests

```bash
# Create and migrate the dedicated E2E database, then seed its account
createdb secyourflow_e2e
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/secyourflow_e2e"
export DATABASE_URL="$TEST_DATABASE_URL"
bun run db:generate
bun run db:migrate
bun run test:e2e:seed
bun run playwright install chromium
# Playwright starts its own server on port 3100 with .next-e2e output
bun run test:e2e

# Run E2E tests with UI
bun run test:e2e:ui
```

## Test Database Setup

Integration and E2E tests require a dedicated test PostgreSQL database.

### Local Setup

1. Create a test database:
   ```bash
   createdb secyourflow_test
   ```

2. Set the environment variable:
   ```bash
   export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/secyourflow_test"
   export DATABASE_URL="$TEST_DATABASE_URL"
   ```

3. Generate Prisma types and run migrations:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

### Docker Setup

```bash
docker run -d \
  --name secyourflow-test-db \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=secyourflow_test \
  -p 5432:5432 \
  postgres:16
```

## CI/CD

The CI pipeline runs on every push and pull request to `main` and `SecyouFlow_V2` branches.

### Pipeline Stages

1. **TypeScript Type Check** - `bun run typecheck`
2. **Lint & Format** - `bun run check:changed` against the PR base or previous push SHA. `bun run check` remains the full repository audit.
3. **Unit Tests** - `bun run test`
4. **Security Tests** - `bun run test:security`
5. **Integration Tests** - `bun run test:integration` (with PostgreSQL service)
6. **Coverage** - `bun run test:coverage`
7. **Production Build** - `bun run build`
8. **Security Verification** - `bun run security:verify`
9. **E2E Tests** - `bun run test:e2e` (with PostgreSQL service)

### Service Containers

Integration and E2E tests use PostgreSQL 16 service containers with health checks.

## Test Fixtures

All test data is defined in `tests/helpers/test-fixtures.ts`:

- **Organizations**: `orgA`, `orgB` (for multi-tenant testing)
- **Users**: Users for each role in each organization
- **Assets**: Test assets for each organization
- **Vulnerabilities**: Test vulnerabilities with various severities
- **Invitations**: Valid, expired, and used invitations
- **Sessions**: Valid, expired, and cross-organization sessions
- **CVSS Vectors**: Various CVSS test vectors

## Security Testing

### Multi-Tenant Isolation

Tests verify that:
- Users cannot read other organizations' resources
- Users cannot modify other organizations' resources
- Users cannot delete other organizations' resources
- Organization IDs cannot be changed in request parameters

### Authentication

Tests verify that:
- Unauthenticated users cannot access protected resources
- Invalid sessions are rejected
- Expired sessions are rejected
- Missing authentication is rejected

### Authorization (RBAC)

Tests verify that:
- Admin can perform admin actions
- Normal users cannot perform admin actions
- Analysts cannot perform organization-management actions
- Privilege escalation attempts fail

### Invitation Security

Tests verify that:
- Valid invitations can be accepted
- Expired invitations are rejected
- Revoked invitations are rejected
- Already-used invitations are rejected
- Invalid tokens are rejected
- Invitations cannot be reused

### Rate Limiting

Tests verify that:
- Requests below the limit succeed
- Requests above the limit are rejected
- Rate limit resets correctly
- Different users/IPs are handled independently

## Coverage

Coverage is configured in `vitest.config.mts`:

- **Provider**: V8
- **Include**: `src/lib/**`, `src/modules/**`
- **Thresholds for API authorization, invitations, risk scoring, and workflow modules**:
  - Lines: 70%
  - Functions: 70%
  - Branches: 60%
  - Statements: 70%

## Writing Tests

### Unit Tests

```typescript
import { describe, expect, it } from "vitest";

describe("feature", () => {
  it("does something", () => {
    expect(result).toBe(expected);
  });
});
```

### Component Tests

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("Component", () => {
  it("handles user interaction", async () => {
    render(<Component />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Result")).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { describe, expect, it } from "vitest";

describe("API endpoint", () => {
  it("returns data", async () => {
    const response = await fetch("/api/endpoint");
    expect(response.status).toBe(200);
  });
});
```

## Best Practices

1. **Use descriptive test names**: `"rejects access when user belongs to another organization"`
2. **Test security boundaries**: Always test both success and failure cases
3. **Use fixtures**: Reuse test data from `tests/helpers/test-fixtures.ts`
4. **Mock external dependencies**: Use `vi.mock()` for external services
5. **Clean up after tests**: Use `beforeEach` and `afterEach` to reset state
6. **Avoid flaky tests**: Use deterministic data and proper waits
7. **Test edge cases**: Empty inputs, boundary values, malformed data

## Important Assumptions

1. **Test database is isolated**: Never run tests against development or production databases
2. **No real credentials**: All test data uses fake credentials
3. **Deterministic data**: Tests produce the same results on every run
4. **Security is not weakened**: Tests do not bypass or weaken security controls
5. **Production behavior is preserved**: Tests do not change production behavior

## Troubleshooting

### Tests fail with database errors

Ensure `TEST_DATABASE_URL` is set and the database is running:
```bash
echo $TEST_DATABASE_URL
pg_isready -h localhost -p 5432
```

### E2E tests fail to connect

Playwright starts an isolated server automatically. Ensure the dedicated `secyourflow_e2e` database is migrated and seeded, and port 3100 is available. Set `E2E_BASE_URL` to change the test server address.

### Coverage is below thresholds

Run coverage with detailed report:
```bash
bun run test:coverage
open coverage/index.html
```

## File Structure

- `vitest.config.mts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `tests/helpers/` - Shared test utilities and fixtures
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/e2e/` - End-to-end tests
- `.github/workflows/ci.yml` - CI/CD pipeline

## CI repair notes

- Use `bun run test`, not Bun's built-in `bun test`: these tests rely on Vitest's mock hoisting and DOM environments.
- Unit and coverage runs exclude `tests/integration`; database integration tests require the explicit `secyourflow_test` database and execute real Prisma queries, constraints, and rollback.
- CI generates Prisma before type checking and tests. Bun is pinned to the version in `packageManager`, with Node 22 for Vitest and Playwright.
- Coverage still reports all `src/lib` and `src/modules` code. The 70% line/function/statement and 60% branch gates apply to API authorization, invitation utilities, risk scoring, and workflow modules. This is a core-module gate, not a claim of 70% application-wide coverage; the current full report is about 6%.
- Full repository lint has existing debt. CI checks changed files without changing lint rules; run `bun run check` for the full audit. For local CI-equivalent lint, set `LINT_BASE` to the full base commit SHA and run `bun run check:changed` after committing changes.
- Browser tests use the seeded MAIN_OFFICER account sequentially because each user has only one active session. Form assertions match native HTML validation; logout is accessed from the profile menu.
