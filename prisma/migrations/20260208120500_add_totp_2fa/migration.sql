-- Add Google Authenticator compatible 2FA fields
ALTER TABLE "User"
ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totpSecretEnc" TEXT,
ADD COLUMN "totpVerifiedAt" TIMESTAMP(3),
ADD COLUMN "totpRecoveryCodesHash" JSONB,
ADD COLUMN "totpLastUsedStep" INTEGER;
