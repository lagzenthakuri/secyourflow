# Project Structure

## Root Configuration

```
.
├── .env                    # Environment variables (not in git)
├── .env.example            # Environment template
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── next.config.ts          # Next.js configuration
├── eslint.config.mjs       # ESLint rules
├── postcss.config.mjs      # PostCSS configuration
└── prisma.config.ts        # Prisma configuration
```

## Source Code (`src/`)

### Application Routes (`src/app/`)

Next.js App Router structure with route-based organization:

```
src/app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Home/dashboard page
├── globals.css             # Global styles
├── api/                    # API routes
│   ├── auth/              # Authentication endpoints
│   ├── assets/            # Asset management
│   ├── vulnerabilities/   # Vulnerability operations
│   ├── compliance/        # Compliance framework APIs
│   ├── threats/           # Threat intelligence
│   ├── reports/           # Report generation
│   └── ...
├── dashboard/             # Main dashboard views
├── assets/                # Asset inventory pages
├── vulnerabilities/       # Vulnerability management
├── compliance/            # Compliance framework views
├── threats/               # Threat intelligence UI
├── risk-register/         # Risk register pages
├── reports/               # Report management
├── settings/              # Application settings
└── auth/                  # Authentication pages
```

### Components (`src/components/`)

Reusable UI components organized by feature:

```
src/components/
├── ui/                    # Base UI components (buttons, cards, etc.)
├── layout/                # Layout components (header, sidebar, nav)
├── dashboard/             # Dashboard-specific components
├── assets/                # Asset-related components
├── vulnerabilities/       # Vulnerability components
├── compliance/            # Compliance UI components
├── charts/                # Data visualization components
├── risk/                  # Risk assessment components
├── settings/              # Settings UI components
└── providers/             # React context providers
```

### Library Code (`src/lib/`)

Core business logic and utilities:

```
src/lib/
├── auth.ts                # NextAuth configuration
├── auth.config.ts         # Auth config shared between middleware/server
├── prisma.ts              # Prisma client singleton
├── utils.ts               # Utility functions (cn, formatters, etc.)
├── api-auth.ts            # API authentication helpers
├── api-response.ts        # Standardized API responses
├── risk-engine.ts         # Risk scoring calculations
├── compliance-engine.ts   # Compliance status logic
├── scanner-engine.ts      # Scanner integration
├── report-engine.ts       # Report generation
├── logger.ts              # Activity logging
├── crypto/                # Encryption utilities (TOTP)
├── security/              # Security helpers (2FA, sessions)
├── scanners/              # Scanner integrations
├── integrations/          # External service integrations
├── notifications/         # Notification system
├── remediation/           # Remediation workflow
├── reporting/             # Report templates
├── workflow/              # Workflow state management
├── assets/                # Asset management logic
└── discovery/             # Asset discovery
```

### Modules (`src/modules/`)

Feature-specific modules with isolated logic:

```
src/modules/
├── cve-ingestion/         # CVE data ingestion
├── cve-search/            # CVE search functionality
└── threat-intel/          # Threat intelligence processing
```

### Types (`src/types/`)

TypeScript type definitions:

```
src/types/
└── index.ts               # Shared types, enums, interfaces
```

### Hooks (`src/hooks/`)

Custom React hooks:

```
src/hooks/
└── useLoginAudit.ts       # Login audit tracking
```

## Database (`prisma/`)

```
prisma/
├── schema.prisma          # Database schema definition
└── migrations/            # Migration history
```

## Public Assets (`public/`)

Static files served directly:

```
public/
├── favicon.png
├── logo1.png
└── uploads/               # User-uploaded files
    └── compliance-evidence/
```

## Architecture Patterns

### API Routes
- Located in `src/app/api/`
- Use `api-auth.ts` for authentication
- Return standardized responses via `api-response.ts`
- Follow REST conventions

### Components
- Functional components with TypeScript
- Use `cn()` utility from `utils.ts` for className merging
- Separate UI components (`components/ui/`) from feature components

### Database Access
- Always use Prisma client from `src/lib/prisma.ts`
- Define models in `prisma/schema.prisma`
- Use migrations for schema changes

### Authentication
- NextAuth.js handles all auth flows
- Session stored as JWT
- RBAC enforced via user roles
- 2FA/TOTP support with encrypted secrets

### State Management
- React Context for global state (providers)
- Server components for data fetching where possible
- Client components only when interactivity needed

### Styling
- TailwindCSS utility classes
- Use `cn()` for conditional classes
- Consistent color scheme via utility functions in `utils.ts`

## Import Conventions

Use path aliases for cleaner imports:

```typescript
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Asset } from '@/types'
```

## File Naming

- Components: PascalCase (e.g., `AssetCard.tsx`)
- Utilities: camelCase (e.g., `risk-engine.ts`)
- API routes: kebab-case folders (e.g., `api/asset-groups/`)
- Types: PascalCase for interfaces/types
