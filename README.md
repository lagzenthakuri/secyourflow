# SecYourFlow 🔒

A comprehensive vulnerability management and compliance platform built with Next.js, Prisma, and PostgreSQL. Track CVEs, manage assets, ensure compliance, and maintain security posture across your organization.

## ✨ Features

- **Vulnerability Management**: Track and manage CVEs with real-time data from NVD, CISA KEV, and EPSS
- **Asset Management**: Monitor servers, workstations, cloud instances, and more
- **Compliance Frameworks**: Support for multiple compliance standards (NIST, ISO, etc.)
- **Risk Register**: AI-powered risk assessment and management
- **Threat Intelligence**: Integration with threat feeds and indicators
- **2FA/TOTP**: Secure authentication with time-based one-time passwords
- **Audit Logging**: Complete audit trail of all system activities
- **Reports & Analytics**: Generate compliance and vulnerability reports
- **Multi-tenant**: Organization-based access control

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
- API keys for external services (NVD, GitHub, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secyourflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the `.env` file and configure your environment variables:
   ```bash
   cp .env .env.local
   ```
   
   Update the following required variables in `.env.local`:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `AUTH_SECRET` / `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `TOTP_ENCRYPTION_KEY`: Generate with `openssl rand -base64 32`
   - API keys for external services (optional but recommended)

4. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

6. **Seed the database (optional)**
   ```bash
   npx prisma db seed
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000)

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build production bundle (includes Prisma generation) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint for code quality checks |
| `npm test` | Run tests with Vitest |
| `npm run typecheck` | Run TypeScript type checking |

## 🗄️ Database Commands

| Command | Description |
|---------|-------------|
| `npx prisma generate` | Generate Prisma Client from schema |
| `npx prisma migrate dev` | Create and apply migrations in development |
| `npx prisma migrate deploy` | Apply migrations in production |
| `npx prisma db push` | Push schema changes without migrations |
| `npx prisma db seed` | Seed database with initial data |
| `npx prisma studio` | Open Prisma Studio (database GUI) |
| `npx prisma db pull` | Pull schema from existing database |

## 🔧 Configuration

### Environment Variables

#### Database
- `DATABASE_URL`: PostgreSQL connection string

#### Authentication
- `AUTH_SECRET` / `NEXTAUTH_SECRET`: Secret for NextAuth.js
- `NEXTAUTH_URL`: Application URL (default: http://localhost:3000)
- `TOTP_ENCRYPTION_KEY`: Encryption key for 2FA secrets
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: GitHub OAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth

#### CVE Data Sources
- `NVD_API_KEY`: National Vulnerability Database API key
- `NVD_API_BASE_URL`: NVD API endpoint
- `CVE_MITRE_BASE_URL`: MITRE CVE API endpoint
- `CISA_KEV_URL`: CISA Known Exploited Vulnerabilities feed
- `EPSS_API_BASE_URL`: EPSS API endpoint
- `GITHUB_TOKEN`: GitHub token for CVE list releases

#### Ingestion Configuration
- `INGEST_CRON`: Cron schedule for CVE ingestion
- `INGEST_CONCURRENCY`: Number of concurrent ingestion workers
- `INGEST_MAX_WINDOW_DAYS`: Maximum days to look back for CVEs
- `ADMIN_API_TOKEN`: Token for admin API endpoints

#### Email & Storage (Optional)
- `SENDGRID_USERNAME` / `SENDGRID_PASSWORD`: SendGrid email service
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`: Cloudinary storage

### Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:

- **User**: User accounts with role-based access and 2FA support
- **Organization**: Multi-tenant organization structure
- **Asset**: IT assets (servers, workstations, cloud instances, etc.)
- **Vulnerability**: Security vulnerabilities and CVEs
- **ComplianceFramework**: Compliance standards and controls
- **RiskRegister**: Risk assessment and management
- **ThreatFeed**: Threat intelligence feeds
- **AuditLog**: Complete audit trail

## 🏗️ Project Structure

```
secyourflow/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts               # Database seeding script
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── 2fa/          # Two-factor authentication
│   │   │   ├── assets/       # Asset management
│   │   │   ├── vulnerabilities/ # Vulnerability management
│   │   │   ├── compliance/   # Compliance framework
│   │   │   ├── cves/         # CVE search and details
│   │   │   └── ...
│   │   ├── dashboard/        # Dashboard pages
│   │   ├── assets/           # Asset management UI
│   │   ├── compliance/       # Compliance UI
│   │   ├── cves/             # CVE browser
│   │   └── ...
│   ├── components/           # React components
│   ├── lib/                  # Utility functions
│   └── types/                # TypeScript types
├── public/                   # Static assets
├── scripts/                  # Utility scripts
└── ...
```

## 🔐 Security Features

- **Authentication**: NextAuth.js with multiple providers (credentials, GitHub, Google)
- **2FA/TOTP**: Time-based one-time password support with recovery codes
- **Role-Based Access**: IT_OFFICER, PENTESTER, ANALYST, MAIN_OFFICER roles
- **Session Management**: Configurable session timeout
- **Password Policies**: Enforced password strength requirements
- **Audit Logging**: Complete activity tracking
- **Encrypted Secrets**: TOTP secrets encrypted at rest

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/2fa/totp/status` - Check 2FA status
- `POST /api/2fa/totp/enroll` - Enroll in 2FA
- `POST /api/2fa/totp/verify` - Verify 2FA code

### Assets
- `GET /api/assets` - List assets
- `POST /api/assets` - Create asset
- `GET /api/assets/[id]` - Get asset details
- `PUT /api/assets/[id]` - Update asset
- `DELETE /api/assets/[id]` - Delete asset

### Vulnerabilities
- `GET /api/vulnerabilities` - List vulnerabilities
- `POST /api/vulnerabilities` - Create vulnerability
- `GET /api/vulnerabilities/[id]` - Get vulnerability details
- `POST /api/vulnerabilities/[id]/analyze` - AI risk analysis

### CVEs
- `GET /api/cves/search` - Search CVEs
- `GET /api/cves/[cveId]` - Get CVE details

### Compliance
- `GET /api/compliance` - List frameworks
- `POST /api/compliance` - Create framework
- `GET /api/compliance/controls` - List controls
- `GET /api/compliance/monitor` - Compliance monitoring

### Risk Management
- `GET /api/risk-register` - List risk entries
- `POST /api/risk-register/generate` - Generate risk assessment
- `POST /api/risk/calculate` - Calculate risk score

## 🧪 Testing

Run the test suite:
```bash
npm test
```

For real API integration tests, set:
```bash
REAL_API_TESTS=true npm test
```

## 🚢 Deployment

### Production Build

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Environment Setup

Ensure all production environment variables are set:
- Use strong secrets for `AUTH_SECRET` and `TOTP_ENCRYPTION_KEY`
- Configure production `DATABASE_URL`
- Set `NEXTAUTH_URL` to your production domain
- Add API keys for external services

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📧 Support

For issues and questions, please contact the development team.

---

Built with ❤️ using Next.js, Prisma, and PostgreSQL
