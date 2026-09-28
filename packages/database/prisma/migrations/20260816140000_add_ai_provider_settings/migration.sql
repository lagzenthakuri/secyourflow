-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "aiEndpoint" TEXT,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiProvider" TEXT NOT NULL DEFAULT 'OLLAMA';

