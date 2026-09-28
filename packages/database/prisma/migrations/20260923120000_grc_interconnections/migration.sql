-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DataCategory') THEN
        CREATE TYPE "DataCategory" AS ENUM ('CUSTOMER_PII', 'EMPLOYEE_DATA', 'FINANCIAL_DATA', 'AUTHENTICATION_CREDENTIALS', 'BUSINESS_SENSITIVE', 'HEALTH_DATA', 'TELEMETRY', 'OTHER');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DataClassification') THEN
        CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorAssetRelationshipType') THEN
        CREATE TYPE "VendorAssetRelationshipType" AS ENUM ('PROVIDES', 'MANAGES', 'HOSTS', 'OPERATES', 'SUPPORTS');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorDataAccessType') THEN
        CREATE TYPE "VendorDataAccessType" AS ENUM ('COLLECTS', 'ACCESSES', 'STORES', 'PROCESSES', 'SHARES');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetDataRole') THEN
        CREATE TYPE "AssetDataRole" AS ENUM ('STORES', 'PROCESSES', 'TRANSITS');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RiskAppetiteLevel') THEN
        CREATE TYPE "RiskAppetiteLevel" AS ENUM ('AVERSE', 'CAUTIOUS', 'MODERATE', 'OPEN', 'HUNGRY');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RiskAppetiteStatus') THEN
        CREATE TYPE "RiskAppetiteStatus" AS ENUM ('WITHIN', 'APPROACHING', 'EXCEEDED', 'NOT_EVALUATED');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "RiskRegister" ADD COLUMN     "vendorId" TEXT;

-- CreateTable
CREATE TABLE "DataAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DataCategory" NOT NULL DEFAULT 'BUSINESS_SENSITIVE',
    "classification" "DataClassification" NOT NULL DEFAULT 'INTERNAL',
    "description" TEXT,
    "retentionNotes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorAssetLink" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "relationshipType" "VendorAssetRelationshipType" NOT NULL DEFAULT 'MANAGES',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorAssetLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDataLink" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "dataAssetId" TEXT NOT NULL,
    "accessType" "VendorDataAccessType" NOT NULL DEFAULT 'ACCESSES',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDataLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDataLink" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "dataAssetId" TEXT NOT NULL,
    "dataRole" "AssetDataRole" NOT NULL DEFAULT 'STORES',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetDataLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAppetite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "appetiteLevel" "RiskAppetiteLevel" NOT NULL DEFAULT 'MODERATE',
    "toleranceMax" INTEGER NOT NULL,
    "statement" TEXT NOT NULL,
    "boardApproved" BOOLEAN NOT NULL DEFAULT false,
    "boardApprovedAt" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "owner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskAppetite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRiskLink" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyRiskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAssetLink" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAssetLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyVendorLink" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyVendorLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyDataLink" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "dataAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyDataLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyControlLink" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyControlLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataAsset_organizationId_idx" ON "DataAsset"("organizationId");

-- CreateIndex
CREATE INDEX "DataAsset_organizationId_category_idx" ON "DataAsset"("organizationId", "category");

-- CreateIndex
CREATE INDEX "DataAsset_organizationId_classification_idx" ON "DataAsset"("organizationId", "classification");

-- CreateIndex
CREATE UNIQUE INDEX "DataAsset_organizationId_name_key" ON "DataAsset"("organizationId", "name");

-- CreateIndex
CREATE INDEX "VendorAssetLink_assetId_idx" ON "VendorAssetLink"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorAssetLink_vendorId_assetId_key" ON "VendorAssetLink"("vendorId", "assetId");

-- CreateIndex
CREATE INDEX "VendorDataLink_dataAssetId_idx" ON "VendorDataLink"("dataAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorDataLink_vendorId_dataAssetId_key" ON "VendorDataLink"("vendorId", "dataAssetId");

-- CreateIndex
CREATE INDEX "AssetDataLink_dataAssetId_idx" ON "AssetDataLink"("dataAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDataLink_assetId_dataAssetId_key" ON "AssetDataLink"("assetId", "dataAssetId");

-- CreateIndex
CREATE INDEX "RiskAppetite_organizationId_idx" ON "RiskAppetite"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAppetite_organizationId_category_key" ON "RiskAppetite"("organizationId", "category");

-- CreateIndex
CREATE INDEX "PolicyRiskLink_riskId_idx" ON "PolicyRiskLink"("riskId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyRiskLink_policyId_riskId_key" ON "PolicyRiskLink"("policyId", "riskId");

-- CreateIndex
CREATE INDEX "PolicyAssetLink_assetId_idx" ON "PolicyAssetLink"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAssetLink_policyId_assetId_key" ON "PolicyAssetLink"("policyId", "assetId");

-- CreateIndex
CREATE INDEX "PolicyVendorLink_vendorId_idx" ON "PolicyVendorLink"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyVendorLink_policyId_vendorId_key" ON "PolicyVendorLink"("policyId", "vendorId");

-- CreateIndex
CREATE INDEX "PolicyDataLink_dataAssetId_idx" ON "PolicyDataLink"("dataAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDataLink_policyId_dataAssetId_key" ON "PolicyDataLink"("policyId", "dataAssetId");

-- CreateIndex
CREATE INDEX "PolicyControlLink_controlId_idx" ON "PolicyControlLink"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyControlLink_policyId_controlId_key" ON "PolicyControlLink"("policyId", "controlId");

-- CreateIndex
CREATE INDEX "RiskRegister_vendorId_idx" ON "RiskRegister"("vendorId");

-- CreateIndex
CREATE INDEX "Policy_organizationId_status_idx" ON "Policy"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Policy_nextReview_idx" ON "Policy"("nextReview");

-- AddForeignKey
ALTER TABLE "RiskRegister" ADD CONSTRAINT "RiskRegister_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Nis2Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataAsset" ADD CONSTRAINT "DataAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAssetLink" ADD CONSTRAINT "VendorAssetLink_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Nis2Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorAssetLink" ADD CONSTRAINT "VendorAssetLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDataLink" ADD CONSTRAINT "VendorDataLink_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Nis2Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDataLink" ADD CONSTRAINT "VendorDataLink_dataAssetId_fkey" FOREIGN KEY ("dataAssetId") REFERENCES "DataAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDataLink" ADD CONSTRAINT "AssetDataLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDataLink" ADD CONSTRAINT "AssetDataLink_dataAssetId_fkey" FOREIGN KEY ("dataAssetId") REFERENCES "DataAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAppetite" ADD CONSTRAINT "RiskAppetite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRiskLink" ADD CONSTRAINT "PolicyRiskLink_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRiskLink" ADD CONSTRAINT "PolicyRiskLink_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "RiskRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAssetLink" ADD CONSTRAINT "PolicyAssetLink_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAssetLink" ADD CONSTRAINT "PolicyAssetLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyVendorLink" ADD CONSTRAINT "PolicyVendorLink_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyVendorLink" ADD CONSTRAINT "PolicyVendorLink_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Nis2Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDataLink" ADD CONSTRAINT "PolicyDataLink_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDataLink" ADD CONSTRAINT "PolicyDataLink_dataAssetId_fkey" FOREIGN KEY ("dataAssetId") REFERENCES "DataAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyControlLink" ADD CONSTRAINT "PolicyControlLink_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyControlLink" ADD CONSTRAINT "PolicyControlLink_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "ComplianceControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

