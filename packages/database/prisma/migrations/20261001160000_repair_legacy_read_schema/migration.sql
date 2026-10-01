-- Some deployments were provisioned without Prisma migration history and
-- still have the legacy Invitation columns. Preserve tokens and their expiry;
-- do not invent an inviter for rows that never recorded one.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invitation' AND column_name = 'expires'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invitation' AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE "Invitation" RENAME COLUMN "expires" TO "expiresAt";
  END IF;
END $$;

ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Invitation" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "Invitation" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Invitation" ALTER COLUMN "updatedAt" SET NOT NULL;

-- The legacy boolean has no consumption timestamp. Record migration time for
-- previously consumed tokens so they remain consumed, rather than reopening them.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Invitation' AND column_name = 'isUsed'
  ) THEN
    UPDATE "Invitation" SET "usedAt" = CURRENT_TIMESTAMP
    WHERE "isUsed" = TRUE AND "usedAt" IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invitation_createdById_fkey' AND conrelid = '"Invitation"'::regclass) THEN
    ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");
CREATE INDEX IF NOT EXISTS "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");

-- Nullable storage supports pre-existing evidence saved on disk.
ALTER TABLE "ComplianceEvidenceVersion" ADD COLUMN IF NOT EXISTS "data" BYTEA;

CREATE TABLE IF NOT EXISTS "Page" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL
);
