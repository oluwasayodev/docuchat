"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { streamChat } from "@/lib/api/conversations";
import type { Message, SearchChunk } from "@/lib/api/types";
import {
  queryKeys,
  useAttachDocuments,
  useConversation,
  useDetachDocument,
  useDocuments,
  useMessages,
} from "@/lib/api/hooks";

interface ConversationPanelProps {
  conversationId: string | null;
  onFocusSource: (documentId: string, page: number | null) => void;
}

interface Streaming {
  question: string;
  answer: string;
  sources: SearchChunk[];
  error: string | null;
  done: boolean;
}

export function ConversationPanel({
  conversationId,
  onFocusSource,
}: ConversationPanelProps) {
  const queryClient = useQueryClient();
  const messages = useMessages(conversationId);
  const conversation = useConversation(conversationId);
  const documents = useDocuments();
  const attach = useAttachDocuments(conversationId);
  const detach = useDetachDocument(conversationId);

  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<Streaming | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const attachedIds = new Set(
    (conversation.data?.documents ?? []).map((entry) => entry.documentId),
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.data, streaming?.answer, streaming?.question]);

  const documentName = (id: string) =>
    documents.data?.items.find((item) => item.id === id)?.name ?? "Document";

  const send = async () => {
    const question = draft.trim();
    if (!conversationId || !question || streaming) return;

    setDraft("");
    setStreaming({ question, answer: "", sources: [], error: null, done: false });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of streamChat(conversationId, { question }, controller.signal)) {
        if (controller.signal.aborted) break;
        if (event.type === "citations") {
          setStreaming((prev) => (prev ? { ...prev, sources: event.chunks } : prev));
        } else if (event.type === "content") {
          setStreaming((prev) =>
            prev ? { ...prev, answer: prev.answer + event.text } : prev,
          );
        } else if (event.type === "error") {
          setStreaming((prev) =>
            prev ? { ...prev, error: event.message ?? "The response stream failed." } : prev,
          );
        } else if (event.type === "done") {
          setStreaming((prev) => (prev ? { ...prev, done: true } : prev));
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        setStreaming((prev) =>
          prev ? { ...prev, error: "The connection was interrupted." } : prev,
        );
      }
    } finally {
      abortRef.current = null;
      try {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(conversationId),
        });
      } finally {
        setStreaming(null);
      }
    }
  };

  return (
    <section className="flex w-full min-w-0 flex-col lg:w-[42%] lg:min-w-[22rem] lg:flex-none">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <p className="truncate font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
          {conversation.data?.title ?? "Conversation"}
        </p>
        <span className="shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
          {attachedIds.size} attached
        </span>
      </header>

      {conversationId ? (
        <div className="border-b border-line">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
              Sources for this conversation
            </p>
            <button
              type="button"
              onClick={() => setAttachOpen((value) => !value)}
              className="rounded-xs border border-line px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              {attachOpen ? "Done" : "Manage"}
            </button>
          </div>
          {attachOpen ? (
            <ul className="max-h-44 space-y-0.5 overflow-y-auto px-2 pb-2">
              {(documents.data?.items ?? []).map((document) => {
                const attached = attachedIds.has(document.id);
                const ready = document.status === "READY";
                return (
                  <li key={document.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!attached && !ready}
                      onClick={() =>
                        attached ? detach.mutate(document.id) : attach.mutate([document.id])
                      }
                      className={`flex w-full items-center justify-between gap-3 rounded-xs px-2 py-1.5 text-left text-sm transition-colors ${
                        attached
                          ? "bg-paper text-ink"
                          : "text-ink-soft hover:bg-paper hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{document.name}</span>
                      <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">
                        {attached ? "attached" : ready ? "attach" : document.status.toLowerCase()}
                      </span>
                    </button>
                  </li>
                );
              })}
              {(documents.data?.items ?? []).length === 0 ? (
                <li className="px-2 py-2 text-xs text-muted">
                  Upload a document to attach it.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {!conversationId ? (
          <p className="pt-10 text-center text-sm text-muted">
            Select a conversation, or create a new one, to start asking questions.
          </p>
        ) : messages.isPending ? (
          <p className="text-sm text-muted">Loading conversation…</p>
        ) : (messages.data ?? []).length === 0 ? (
          <div className="pt-10 text-center">
            <p className="text-sm text-muted">No messages yet.</p>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted/80">
              Ask a question about the attached documents — answers are grounded in their
              pages, with the passages shown as evidence.
            </p>
          </div>
        ) : (
          <>
            {(messages.data ?? []).map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {streaming ? (
              <>
                <Bubble role="USER" content={streaming.question} />
                <Bubble role="ASSISTANT" content={streaming.answer} pending={!streaming.done} />
                {streaming.error ? (
                  <p className="rounded-xs border border-accent/40 bg-accent-soft/60 px-3 py-2 text-sm text-accent">
                    {streaming.error}
                  </p>
                ) : null}
                {streaming.sources.length > 0 ? (
                  <Sources
                    sources={streaming.sources}
                    documentName={documentName}
                    onSelect={onFocusSource}
                  />
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={2}
            disabled={!conversationId || Boolean(streaming)}
            placeholder={
              conversationId
                ? "Ask about the attached documents…"
                : "Select a conversation to begin"
            }
            className="min-h-[2.75rem] w-full resize-none rounded-xs border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent disabled:opacity-60"
          />
          {streaming ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="shrink-0 rounded-xs border border-line px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={!conversationId || !draft.trim()}
              className="shrink-0 rounded-xs bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: Message }) {
  return <Bubble role={message.role} content={message.content} />;
}

function Bubble({
  role,
  content,
  pending,
}: {
  role: Message["role"];
  content: string;
  pending?: boolean;
}) {
  const isAssistant = role === "ASSISTANT";
  return (
    <div className={isAssistant ? "flex justify-start" : "flex justify-end"}>
      <div
        className={`max-w-[88%] whitespace-pre-wrap break-words rounded-sm px-3.5 py-2.5 text-sm leading-relaxed ${
          isAssistant
            ? "border border-line bg-paper-raised text-ink"
            : "bg-ink text-paper"
        }`}
      >
        {content || (pending ? "" : "…")}
        {pending ? (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-text-bottom" />
        ) : null}
      </div>
    </div>
  );
}

function Sources({
  sources,
  documentName,
  onSelect,
}: {
  sources: SearchChunk[];
  documentName: (id: string) => string;
  onSelect: (documentId: string, page: number | null) => void;
}) {
  return (
    <div className="rounded-sm border border-line bg-paper-raised p-3">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">
        {sources.length} passage{sources.length === 1 ? "" : "s"} used
      </p>
      <ul className="mt-2 space-y-1.5">
        {sources.map((source) => (
          <li key={source.id}>
            <button
              type="button"
              onClick={() => onSelect(source.documentId, source.page ?? null)}
              className="w-full rounded-xs border border-line px-2.5 py-2 text-left transition-colors hover:border-accent"
            >
              <span className="flex items-center justify-between gap-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">
                <span className="min-w-0 truncate normal-case tracking-normal text-ink-soft">
                  {documentName(source.documentId)}
                </span>
                <span className="shrink-0">
                  {source.page ? `p.${source.page} · ` : ""}
                  {source.score.toFixed(2)}
                </span>
              </span>
              <span className="mt-1 block line-clamp-2 text-xs text-muted">
                {source.content}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
