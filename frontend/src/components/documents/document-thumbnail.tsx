"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { downloadDocument } from "@/lib/api/documents";
import { queryKeys } from "@/lib/api/hooks";

const PdfThumb = dynamic(() => import("@/components/documents/pdf-thumb"), {
  ssr: false,
  loading: () => <Placeholder label="Rendering" />,
});

interface DocumentThumbnailProps {
  documentId: string;
  width?: number;
}

export function DocumentThumbnail({ documentId, width = 168 }: DocumentThumbnailProps) {
  const { data: file, isPending, isError } = useQuery({
    queryKey: [...queryKeys.documents.detail(documentId), "file"],
    queryFn: () => downloadDocument(documentId),
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
  });

  if (isError) return <Placeholder label="No preview" />;
  if (isPending || !file) return <Placeholder label="Loading" />;

  return (
    <div className="overflow-hidden rounded-xs border border-line bg-paper-raised">
      <PdfThumb file={file} width={width} />
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="grid h-[236px] w-[168px] place-items-center rounded-xs border border-line bg-paper-raised">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
    </div>
  );
}
