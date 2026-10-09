/*
  Warnings:

  - Added the required column `embedding` to the `document_chunks` table without a default value. This is not possible if the table is not empty.

*/

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "document_chunks" ADD COLUMN "embedding" vector(1536);

-- CreateIndex
CREATE INDEX "embedding_hnsw_idx" ON "document_chunks"
USING hnsw ("embedding" vector_cosine_ops);


