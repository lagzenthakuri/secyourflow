# Tech Stack

## Framework & Runtime

- **Next.js 16.1+**: React framework with App Router
- **React 19**: UI library
- **TypeScript 5**: Type-safe development
- **Node.js 20+**: Runtime environment

## Database & ORM

- **PostgreSQL**: Primary database
- **Prisma 6**: ORM with type-safe queries
- **@prisma/adapter-pg**: PostgreSQL adapter

## Authentication & Security

- **NextAuth.js 5 (beta)**: Authentication with JWT strategy
- **@auth/prisma-adapter**: Prisma integration for NextAuth
- **bcryptjs**: Password hashing
- **otplib**: TOTP/2FA implementation
- **qrcode**: QR code generation for 2FA setup

## UI & Styling

- **TailwindCSS 4**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Recharts**: Data visualization and charts
- **react-simple-maps**: Geographic visualizations
- **d3-geo**: Geographic projections

## Data Handling

- **Zod 4**: Schema validation
- **jspdf & jspdf-autotable**: PDF report generation
- **xlsx**: Excel file generation

## Testing

- **Vitest 4**: Unit and integration testing
- **@types/***: TypeScript type definitions

## Development Tools

- **ESLint 9**: Code linting with Next.js config
- **tsx**: TypeScript execution for scripts
- **Turbopack**: Fast development builds (Next.js)

## Common Commands

### Development

npm run dev              # Start development server (localhost:3000)
npm run build            # Build for production (includes Prisma generate)
npm start                # Start production server

### Database

npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run migrations in development
npx prisma migrate deploy # Apply migrations in production
npx prisma studio        # Open Prisma Studio GUI

### Testing & Quality

npm test                 # Run tests with Vitest
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking

### Compliance Template Import

npm run import:iso27001  # Import ISO 27001 controls
npm run import:nistcsf   # Import NIST CSF controls
npm run import:pcidss    # Import PCI DSS controls
npm run import:soc2      # Import SOC2 controls
npm run import:framework # Import generic framework

## Environment Variables

Required:
- AUTH_SECRET: NextAuth secret key
- NEXTAUTH_URL: Application URL
- DATABASE_URL: PostgreSQL connection string
- TOTP_ENCRYPTION_KEY: Encryption key for 2FA secrets

Optional:
- SHADOW_DATABASE_URL: For Prisma migrations
- REAL_API_TESTS: Enable real API tests (default: false)

## Code Style

- **Strict TypeScript**: All code must be type-safe
- **ESLint**: Follow Next.js recommended rules
- **Path Aliases**: Use @/* for imports from src/
- **React Strict Mode**: Enabled in production
- **Console Logs**: Removed in production (except error/warn)
