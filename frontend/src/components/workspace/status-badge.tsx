import type { DocumentStatus } from "@/lib/api/types";

const styles: Record<DocumentStatus, string> = {
  UPLOADED: "border-line text-muted",
  PROCESSING: "border-accent/50 text-accent",
  READY: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
  FAILED: "border-red-500/50 text-red-600 dark:text-red-400",
};

const labels: Record<DocumentStatus, string> = {
  UPLOADED: "Queued",
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`rounded-xs border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
