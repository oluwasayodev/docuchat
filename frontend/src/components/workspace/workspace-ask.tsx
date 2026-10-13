"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { attachDocuments, createConversation } from "@/lib/api/conversations";
import { queryKeys, useDocuments } from "@/lib/api/hooks";

interface WorkspaceAskProps {
  onAsk: (conversationId: string, question: string) => void;
}

export function WorkspaceAsk({ onAsk }: WorkspaceAskProps) {
  const queryClient = useQueryClient();
  const documents = useDocuments();
  const [draft, setDraft] = useState("");

  const readyDocuments = (documents.data?.items ?? []).filter(
    (document) => document.status === "READY",
  );

  const ask = useMutation({
    mutationFn: async (question: string) => {
      const created = await createConversation(question.slice(0, 80));
      if (readyDocuments.length > 0) {
        await attachDocuments(
          created.id,
          readyDocuments.map((document) => document.id),
        );
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
    },
  });

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || readyDocuments.length === 0 || ask.isPending) return;
    setDraft("");
    ask.mutate(question, {
      onSuccess: (created) => onAsk(created.id, question),
    });
  };

  const disabled = readyDocuments.length === 0 || ask.isPending;

  return (
    <form onSubmit={submit} className="shrink-0 border-b border-line bg-paper px-4 py-3">
      <div className="mx-auto flex w-full max-w-[1100px] items-start gap-3">
        <span className="mt-3 hidden shrink-0 items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Workspace
        </span>
        <div className="min-w-0 flex-1">
          <div className="relative flex items-center gap-2 rounded-[14px] border border-line bg-paper-raised py-1.5 pl-2 pr-1.5 shadow-[0_1px_2px_rgba(30,28,20,0.05),0_10px_30px_-20px_rgba(30,28,20,0.35)]">
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-accent">
              All docs
            </span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask across all your documents…"
              disabled={disabled}
              aria-label="Ask across all your documents"
              className="min-w-0 flex-1 bg-transparent py-1 font-serif text-[15px] leading-[1.4] text-ink outline-none placeholder:text-muted/70 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={disabled || !draft.trim()}
              aria-label="Ask across all documents"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-ink text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-paper-raised"
            >
              {ask.isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                  <path
                    d="M12 19V5M6 11l6-6 6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1.5 truncate px-0.5 text-[11px] text-muted/80">
            {readyDocuments.length > 0
              ? `Searches all ${readyDocuments.length} ready document${
                  readyDocuments.length === 1 ? "" : "s"
                } — each ask starts a new conversation.`
              : "No ready documents yet — upload one and wait for it to finish processing."}
          </p>
        </div>
      </div>
    </form>
  );
}
