"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/workspace/status-badge";
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useDeleteDocument,
  useDocuments,
  useReprocessDocument,
  useUploadDocument,
} from "@/lib/api/hooks";

interface SidebarProps {
  conversationId: string | null;
  onSelectConversation: (id: string) => void;
  documentId: string | null;
  onSelectDocument: (id: string) => void;
}

const rowBase =
  "w-full truncate rounded-xs px-2 py-1.5 text-left text-sm transition-colors";

export function Sidebar({
  conversationId,
  onSelectConversation,
  documentId,
  onSelectDocument,
}: SidebarProps) {
  const conversations = useConversations();
  const documents = useDocuments();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const upload = useUploadDocument();
  const removeDocument = useDeleteDocument();
  const reprocess = useReprocessDocument();
  const fileInput = useRef<HTMLInputElement>(null);

  const onNewConversation = async () => {
    const created = await createConversation.mutateAsync(undefined);
    onSelectConversation(created.id);
  };

  const onUpload = async (file: File) => {
    const created = await upload.mutateAsync({ file });
    onSelectDocument(created.id);
  };

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-line bg-paper-raised md:flex">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
          Conversations
        </h2>
        <button
          type="button"
          onClick={onNewConversation}
          disabled={createConversation.isPending}
          className="rounded-xs border border-line px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          + New
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto p-2">
        {conversations.isPending ? (
          <Hint>Loading…</Hint>
        ) : conversations.data && conversations.data.items.length > 0 ? (
          <ul className="space-y-0.5">
            {conversations.data.items.map((conversation) => {
              const active = conversation.id === conversationId;
              return (
                <li key={conversation.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`${rowBase} ${
                      active
                        ? "bg-paper text-ink"
                        : "text-ink-soft hover:bg-paper hover:text-ink"
                    }`}
                  >
                    {conversation.title ?? "Untitled conversation"}
                  </button>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    onClick={() => deleteConversation.mutate(conversation.id)}
                    className="shrink-0 rounded-xs px-1.5 py-1 text-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Hint>No conversations yet.</Hint>
        )}
      </div>

      <div className="flex items-center justify-between border-y border-line px-4 py-3">
        <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
          Documents
        </h2>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={upload.isPending}
          className="rounded-xs border border-line px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          {upload.isPending ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onUpload(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {documents.isPending ? (
          <Hint>Loading…</Hint>
        ) : documents.data && documents.data.items.length > 0 ? (
          <ul className="space-y-0.5">
            {documents.data.items.map((document) => {
              const active = document.id === documentId;
              return (
                <li key={document.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectDocument(document.id)}
                    className={`${rowBase} flex min-w-0 flex-col items-start gap-1 ${
                      active
                        ? "bg-paper text-ink"
                        : "text-ink-soft hover:bg-paper hover:text-ink"
                    }`}
                  >
                    <span className="w-full truncate">{document.name}</span>
                    <StatusBadge status={document.status} />
                  </button>
                  <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100">
                    {document.status === "FAILED" ? (
                      <button
                        type="button"
                        aria-label="Reprocess document"
                        onClick={() => reprocess.mutate(document.id)}
                        className="rounded-xs px-1 text-xs text-muted hover:text-accent"
                      >
                        ↻
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Delete document"
                      onClick={() => removeDocument.mutate(document.id)}
                      className="rounded-xs px-1 text-xs text-muted hover:text-accent"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Hint>No documents yet. Upload a PDF to begin.</Hint>
        )}
        {upload.isError ? <ErrorText>{upload.error?.message ?? "Upload failed."}</ErrorText> : null}
      </div>
    </aside>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="px-2 py-3 text-xs text-muted">{children}</p>;
}

function ErrorText({ children }: { children: ReactNode }) {
  return <p className="px-2 py-2 text-xs text-accent">{children}</p>;
}
