/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `chat_documents` table. All the data in the column will be lost.
  - You are about to drop the column `pages` on the `chat_documents` table. All the data in the column will be lost.
  - Added the required column `mimeType` to the `chat_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizeBytes` to the `chat_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `chat_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `chat_documents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "chat_documents" DROP COLUMN "fileUrl",
DROP COLUMN "pages",
ADD COLUMN     "chunkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL,
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
ADD COLUMN     "storageKey" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_chunks_documentId_idx" ON "document_chunks"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_documentId_index_key" ON "document_chunks"("documentId", "index");

-- CreateIndex
CREATE INDEX "usage_logs_userId_createdAt_idx" ON "usage_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "usage_logs_action_idx" ON "usage_logs"("action");

-- CreateIndex
CREATE INDEX "chat_documents_userId_deletedAt_createdAt_idx" ON "chat_documents"("userId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "chat_documents_userId_status_idx" ON "chat_documents"("userId", "status");

-- AddForeignKey
ALTER TABLE "chat_documents" ADD CONSTRAINT "chat_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "chat_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
