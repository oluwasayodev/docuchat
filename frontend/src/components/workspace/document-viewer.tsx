"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ReactNode } from "react";
import { useDocument } from "@/lib/api/hooks";

const PdfCanvas = dynamic(() => import("@/components/workspace/pdf-canvas"), {
  ssr: false,
  loading: () => <Note>Loading viewer…</Note>,
});

interface DocumentViewerProps {
  documentId: string | null;
  page: number | null;
  onPageChange: (page: number) => void;
}

const ctrl =
  "grid h-6 w-6 place-items-center rounded-xs border border-line text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-40 disabled:hover:border-line";

export function DocumentViewer({ documentId, page, onPageChange }: DocumentViewerProps) {
  const document = useDocument(documentId);
  const [pages, setPages] = useState<{ id: string; count: number } | null>(null);

  const numPages = documentId && pages?.id === documentId ? pages.count : 0;
  const currentPage = page && page >= 1 && page <= numPages ? page : 1;

  return (
    <section className="hidden min-w-0 flex-1 flex-col border-r border-line lg:flex">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <p className="truncate font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
          {document.data?.name ?? "Document"}
        </p>
        {documentId && numPages > 1 ? (
          <div className="flex items-center gap-2 font-mono text-[0.7rem] text-muted">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className={ctrl}
            >
              ‹
            </button>
            <span className="tabular-nums">
              {currentPage} / {numPages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className={ctrl}
            >
              ›
            </button>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1">
        {documentId ? (
          <PdfCanvas
            key={documentId}
            documentId={documentId}
            page={page}
            onNumPages={(count) => setPages({ id: documentId, count })}
          />
        ) : (
          <div className="grid h-full place-items-center p-8">
            <div className="max-w-xs text-center">
              <p className="font-serif text-xl text-ink">No document open</p>
              <p className="mt-2 text-sm text-muted">
                Upload a PDF or pick one from the library to read it alongside the
                conversation.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="p-10 text-center text-sm text-muted">{children}</p>;
}
