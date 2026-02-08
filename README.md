# SecYourFlow

A comprehensive vulnerability management and compliance platform built with Next.js, designed to help organizations track assets, manage vulnerabilities, ensure compliance, and maintain security posture.

## Features

- **Asset Management**: Track servers, workstations, cloud instances, containers, and more
- **Vulnerability Management**: Integrate with multiple scanners (Nessus, OpenVAS, Trivy, Qualys, etc.)
- **CVE Database**: Built-in CVE tracking with EPSS scores and CISA KEV integration
- **Compliance Frameworks**: Support for multiple frameworks with control mapping (ISO 27001, NIST CSF, etc.)
- **Risk Register**: AI-powered risk analysis and treatment planning
- **Threat Intelligence**: Integrate threat feeds and indicators
- **2FA/TOTP**: Enhanced security with time-based one-time passwords
- **Reporting**: Generate compliance and vulnerability reports
- **Audit Logging**: Complete audit trail of all system activities

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 with 2FA support
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts for data visualization
- **Maps**: React Simple Maps with D3
- **Testing**: Vitest
- **Type Safety**: TypeScript

## Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- npm or yarn

## Getting Started

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
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/secyourflow"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Vitest
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
secyourflow/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Database seeding
│   └── migrations/        # Database migrations
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── assets/        # Asset management pages
│   │   ├── compliance/    # Compliance pages
│   │   ├── cves/          # CVE database pages
│   │   ├── dashboard/     # Dashboard
│   │   ├── reports/       # Reporting pages
│   │   ├── scanners/      # Scanner integration
│   │   └── settings/      # Settings pages
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   └── types/             # TypeScript types
├── scripts/               # Utility scripts
└── public/                # Static assets
```

## Key Features

### Asset Management
Track and categorize assets across your infrastructure with support for:
- Physical and virtual servers
- Cloud instances (AWS, Azure, GCP)
- Network devices
- Containers and applications
- Criticality and environment classification

### Vulnerability Management
- Multi-scanner integration
- CVE tracking with EPSS scoring
- CISA KEV monitoring
- Automated risk scoring
- Vulnerability lifecycle management

### Compliance
- Multiple framework support
- Control mapping and assessment
- Evidence management
- Maturity level tracking
- NIST CSF function alignment

### Risk Register
- AI-powered risk analysis
- Treatment option tracking
- Action plan management
- Responsible party assignment
- Control effectiveness monitoring

### Security Features
- Role-based access control (IT Officer, Pentester, Analyst, Main Officer)
- TOTP-based 2FA
- Recovery codes
- Session management
- Comprehensive audit logging

## Database Schema

The application uses PostgreSQL with the following main entities:
- Users & Organizations
- Assets & Vulnerabilities
- Compliance Frameworks & Controls
- CVE Database
- Threat Intelligence
- Risk Register
- Audit Logs

## API Endpoints

Key API routes include:
- `/api/assets` - Asset management
- `/api/vulnerabilities` - Vulnerability tracking
- `/api/cves` - CVE database search
- `/api/compliance` - Compliance framework management
- `/api/risk-register` - Risk analysis and tracking
- `/api/2fa/totp` - Two-factor authentication
- `/api/reports` - Report generation

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the repository.
