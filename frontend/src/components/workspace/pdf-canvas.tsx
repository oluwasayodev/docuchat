"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useQuery } from "@tanstack/react-query";
import { downloadDocument } from "@/lib/api/documents";
import { queryKeys } from "@/lib/api/hooks";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfCanvasProps {
  documentId: string;
  page: number | null;
  onNumPages: (count: number) => void;
}

export default function PdfCanvas({ documentId, page, onNumPages }: PdfCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);

  const { data: file, isPending, isError } = useQuery({
    queryKey: [...queryKeys.documents.detail(documentId), "file"],
    queryFn: () => downloadDocument(documentId),
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = Math.round(Math.min(entry.contentRect.width, 880));
      setWidth((prev) => (prev === next ? prev : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (isPending) return <ViewerNote>Loading document…</ViewerNote>;
  if (isError || !file) return <ViewerNote>Unable to load this document.</ViewerNote>;

  const currentPage = page && page >= 1 && page <= numPages ? page : 1;

  return (
    <div className="h-full w-full overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
      <div ref={containerRef} className="flex w-full justify-center p-6">
        <Document
          file={file}
          options={{
            wasmUrl: "/pdfjs/wasm/",
            cMapUrl: "/pdfjs/cmaps/",
            cMapPacked: true,
            standardFontDataUrl: "/pdfjs/standard_fonts/",
            iccUrl: "/pdfjs/iccs/",
          }}
          onLoadSuccess={(payload) => {
            setNumPages(payload.numPages);
            onNumPages(payload.numPages);
          }}
          onLoadError={(error) => console.error("pdf load error", error)}
          loading={<ViewerNote>Rendering…</ViewerNote>}
          error={<ViewerNote>This file could not be rendered.</ViewerNote>}
        >
          {width > 0 ? (
            <Page
              pageNumber={currentPage}
              width={width}
              className="overflow-hidden rounded-xs border border-line shadow-sm"
            />
          ) : null}
        </Document>
      </div>
    </div>
  );
}

function ViewerNote({ children }: { children: ReactNode }) {
  return <p className="p-10 text-center text-sm text-muted">{children}</p>;
}
