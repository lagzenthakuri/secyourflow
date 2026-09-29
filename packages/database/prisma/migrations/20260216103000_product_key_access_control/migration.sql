-- CreateTable
CREATE TABLE "ProductKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codePrefix" TEXT NOT NULL,
    "targetRole" "Role" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductKeyActivation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productKeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductKeyActivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductKey_organizationId_codeHash_key" ON "ProductKey"("organizationId", "codeHash");

-- CreateIndex
CREATE INDEX "ProductKey_organizationId_targetRole_idx" ON "ProductKey"("organizationId", "targetRole");

-- CreateIndex
CREATE INDEX "ProductKey_organizationId_expiresAt_idx" ON "ProductKey"("organizationId", "expiresAt");

-- CreateIndex
CREATE INDEX "ProductKey_organizationId_revokedAt_idx" ON "ProductKey"("organizationId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductKeyActivation_productKeyId_userId_key" ON "ProductKeyActivation"("productKeyId", "userId");

-- CreateIndex
CREATE INDEX "ProductKeyActivation_organizationId_userId_idx" ON "ProductKeyActivation"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "ProductKeyActivation_organizationId_activatedAt_idx" ON "ProductKeyActivation"("organizationId", "activatedAt");

-- AddForeignKey
ALTER TABLE "ProductKey" ADD CONSTRAINT "ProductKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductKey" ADD CONSTRAINT "ProductKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductKeyActivation" ADD CONSTRAINT "ProductKeyActivation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductKeyActivation" ADD CONSTRAINT "ProductKeyActivation_productKeyId_fkey" FOREIGN KEY ("productKeyId") REFERENCES "ProductKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductKeyActivation" ADD CONSTRAINT "ProductKeyActivation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
