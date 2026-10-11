import { apiFetch, apiFetchBlob } from "@/lib/api/client";
import type { Document, DocumentStatus, Page, SearchChunk } from "@/lib/api/types";

export interface DocumentListParams {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  status?: DocumentStatus;
  search?: string;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function listDocuments(
  params: DocumentListParams = {},
  signal?: AbortSignal,
): Promise<Page<Document>> {
  return apiFetch<Page<Document>>(`/documents${toQuery({ ...params })}`, { signal });
}

export function getDocument(id: string, signal?: AbortSignal): Promise<Document> {
  return apiFetch<Document>(`/documents/${id}`, { signal });
}

export function uploadDocument(
  file: File,
  meta: { name?: string; description?: string } = {},
): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  if (meta.name) form.append("name", meta.name);
  if (meta.description) form.append("description", meta.description);
  return apiFetch<Document>("/documents", { method: "POST", body: form });
}

export function deleteDocument(id: string): Promise<Document> {
  return apiFetch<Document>(`/documents/${id}`, { method: "DELETE" });
}

export function reprocessDocument(id: string): Promise<Document> {
  return apiFetch<Document>(`/documents/${id}/reprocess`, { method: "POST" });
}

export function downloadDocument(id: string): Promise<Blob> {
  return apiFetchBlob(`/documents/${id}/download`);
}

export interface DocumentSearchResponse {
  documentId: string;
  query: string;
  chunks: SearchChunk[];
}

export function searchDocument(
  id: string,
  query: string,
  limit?: number,
): Promise<DocumentSearchResponse> {
  return apiFetch<DocumentSearchResponse>(`/documents/${id}/search`, {
    method: "POST",
    body: { query, limit },
  });
}
