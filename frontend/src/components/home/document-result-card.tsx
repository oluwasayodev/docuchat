"use client";

import { DocumentThumbnail } from "@/components/documents/document-thumbnail";
import type { Document, SearchChunk } from "@/lib/api/types";

export interface DocumentMatch {
  document: Document;
  chunks: SearchChunk[];
  bestScore: number;
  pages: number[];
}

interface DocumentResultCardProps {
  match: DocumentMatch;
  selected: boolean;
  onToggleSelect: (documentId: string) => void;
  onOpen: (documentId: string) => void;
}

export function DocumentResultCard({
  match,
  selected,
  onToggleSelect,
  onOpen,
}: DocumentResultCardProps) {
  const { document, chunks, bestScore, pages } = match;

  return (
    <article
      className={`group flex flex-col rounded-sm border bg-paper-raised transition-colors ${
        selected ? "border-accent" : "border-line hover:border-ink/40"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(document.id)}
        className="flex flex-col items-center gap-3 p-3 text-left"
      >
        <DocumentThumbnail documentId={document.id} />
        <span className="w-full truncate text-sm text-ink" title={document.name}>
          {document.name}
        </span>
      </button>

      <dl className="border-t border-line px-3 py-2 text-[0.7rem] text-muted">
        <div className="flex items-center justify-between gap-2">
          <dt className="sr-only">Created</dt>
          <dd>{formatDate(document.createdAt)}</dd>
          <dd className="shrink-0">
            {document.pageCount ? `${document.pageCount} pages` : "—"}
          </dd>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <dd className="min-w-0 truncate">
            {chunks.length} passage{chunks.length === 1 ? "" : "s"}
            {pages.length > 0 ? ` · p.${pages.join(", p.")}` : ""}
          </dd>
          <dd className="shrink-0 font-mono tabular-nums">{bestScore.toFixed(2)}</dd>
        </div>
      </dl>

      <label className="flex cursor-pointer items-center gap-2 border-t border-line px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(document.id)}
          className="h-3.5 w-3.5 accent-[var(--color-accent)]"
        />
        {selected ? "Selected" : "Select"}
      </label>
    </article>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
