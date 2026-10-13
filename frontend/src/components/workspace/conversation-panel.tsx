"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  initialQuestion?: string | null;
  onInitialQuestionConsumed?: () => void;
  onFocusSource: (documentId: string, page: number | null) => void;
}

interface Streaming {
  question: string;
  answer: string;
  sources: SearchChunk[];
  error: string | null;
  done: boolean;
}

const EXAMPLE_PROMPTS = [
  "Summarize the main argument.",
  "What data or sources are used?",
  "List the key findings.",
];

export function ConversationPanel({
  conversationId,
  initialQuestion,
  onInitialQuestionConsumed,
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const attachedIds = new Set(
    (conversation.data?.documents ?? []).map((entry) => entry.documentId),
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.data, streaming?.answer, streaming?.question]);

  const documentName = (id: string) =>
    documents.data?.items.find((item) => item.id === id)?.name ?? "Document";

  const send = useCallback(async (override?: string) => {
    const question = (override ?? draft).trim();
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
  }, [conversationId, draft, queryClient, streaming]);

  const initialAskedRef = useRef(false);
  useEffect(() => {
    if (!conversationId || !initialQuestion || initialAskedRef.current) return;
    initialAskedRef.current = true;
    void send(initialQuestion);
    onInitialQuestionConsumed?.();
  }, [conversationId, initialQuestion, send, onInitialQuestionConsumed]);

  const applyExample = (prompt: string) => {
    setDraft(prompt);
    inputRef.current?.focus();
  };

  return (
    <section className="flex w-full min-w-0 flex-col lg:w-[42%] lg:min-w-[22rem] lg:flex-none">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <h2 className="truncate font-serif text-[0.95rem] text-ink">
            {conversation.data?.title ?? "Conversation"}
          </h2>
        </div>
        <span className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
          {attachedIds.size} source{attachedIds.size === 1 ? "" : "s"}
        </span>
      </header>

      {conversationId ? (
        <div className="border-b border-line">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
              Sources for this conversation
            </p>
            <button
              type="button"
              onClick={() => setAttachOpen((value) => !value)}
              className="rounded-xs border border-line px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
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

      <div
        ref={scrollRef}
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
      >
        {!conversationId ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted">
              No conversation selected
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Pick a conversation from the left, or create a new one, to start asking
              questions.
            </p>
          </div>
        ) : messages.isPending ? (
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
            Loading conversation…
          </p>
        ) : (messages.data ?? []).length === 0 && !streaming ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="font-serif text-lg text-ink">Ask your documents</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Answers are grounded in the attached documents, with the passages shown as
              evidence.
            </p>
            <ul className="mt-6 w-full max-w-sm space-y-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => applyExample(prompt)}
                    className="group flex w-full items-center justify-between gap-3 rounded-sm border border-line bg-paper-raised px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:border-accent hover:text-ink"
                  >
                    <span>{prompt}</span>
                    <span className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-7">
            {(messages.data ?? []).map((message) => (
              <MessageRow
                key={message.id}
                role={message.role}
                content={message.content}
                createdAt={message.createdAt}
              />
            ))}
            {streaming ? (
              <>
                <MessageRow role="USER" content={streaming.question} />
                <StreamingTurn
                  streaming={streaming}
                  documentName={documentName}
                  onFocusSource={onFocusSource}
                />
              </>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-paper px-4 pb-4 pt-3">
        <div className="mx-auto w-full max-w-[820px]">
          <div className="relative rounded-[14px] border border-line bg-paper-raised p-1.5 shadow-[0_1px_2px_rgba(30,28,20,0.05),0_10px_30px_-20px_rgba(30,28,20,0.35)]">
            <textarea
              ref={inputRef}
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
              className="block w-full resize-none border-0 bg-transparent px-3 pb-1 pt-3 font-serif text-[16px] leading-[1.45] text-ink outline-none placeholder:text-muted/70 disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-3 px-1.5 pb-1 pt-0.5">
              <span className="truncate font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                {conversationId
                  ? `${attachedIds.size} source${attachedIds.size === 1 ? "" : "s"} attached`
                  : ""}
              </span>
              {streaming ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  aria-label="Stop generating"
                  className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-ink text-paper transition-colors hover:bg-accent"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!conversationId || !draft.trim()}
                  aria-label="Send message"
                  className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-ink text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-paper-raised"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                    <path
                      d="M12 19V5M6 11l6-6 6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 select-none text-center text-[11.5px] text-muted/80">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </div>
    </section>
  );
}

function MessageRow({
  role,
  content,
  createdAt,
}: {
  role: Message["role"];
  content: string;
  createdAt?: string;
}) {
  const isAssistant = role === "ASSISTANT";
  const label = isAssistant ? "DocuChat" : role === "USER" ? "You" : "System";

  return (
    <article>
      <div className="flex items-center gap-2.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            isAssistant ? "bg-accent" : "bg-ink/40"
          }`}
        />
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
          {label}
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden />
        {createdAt ? (
          <time className="shrink-0 font-mono text-[0.6rem] tracking-[0.08em] text-muted/70">
            {formatTime(createdAt)}
          </time>
        ) : null}
      </div>
      {isAssistant ? (
        <p className="mt-2.5 whitespace-pre-wrap break-words font-serif text-[0.98rem] leading-[1.75] text-ink">
          {content || "…"}
        </p>
      ) : (
        <p className="mt-2.5 whitespace-pre-wrap break-words border-l-2 border-ink/25 pl-3.5 text-sm leading-relaxed text-ink-soft">
          {content || "…"}
        </p>
      )}
    </article>
  );
}

function StreamingTurn({
  streaming,
  documentName,
  onFocusSource,
}: {
  streaming: Streaming;
  documentName: (id: string) => string;
  onFocusSource: (documentId: string, page: number | null) => void;
}) {
  const hasSources = streaming.sources.length > 0;
  const hasAnswer = streaming.answer.length > 0;

  return (
    <article>
      <div className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" />
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted">
          DocuChat
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>

      {!hasAnswer && !streaming.error ? (
        <ul className="mt-3 space-y-1.5">
          <TraceStep label="Searching documents" active={!hasSources} done={hasSources} />
          <TraceStep
            label="Composing answer"
            active={hasSources}
            done={hasAnswer}
          />
        </ul>
      ) : null}

      <p className="mt-2.5 whitespace-pre-wrap break-words font-serif text-[0.98rem] leading-[1.75] text-ink">
        {streaming.answer}
        {!streaming.error ? (
          <span className="ml-0.5 inline-block h-[1.05em] w-1.5 translate-y-[0.15em] animate-pulse bg-accent align-baseline" />
        ) : null}
      </p>

      {streaming.error ? (
        <p className="mt-3 rounded-sm border border-accent/40 bg-accent-soft/60 px-3.5 py-2.5 text-sm text-accent">
          {streaming.error}
        </p>
      ) : null}

      {hasSources ? (
        <Sources
          sources={streaming.sources}
          documentName={documentName}
          onSelect={onFocusSource}
        />
      ) : null}
    </article>
  );
}

function TraceStep({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.14em]">
      <span
        className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border text-[0.55rem] leading-none ${
          done
            ? "border-accent bg-accent text-paper"
            : active
              ? "border-accent text-accent"
              : "border-line text-transparent"
        }`}
      >
        {done ? "✓" : active ? "•" : ""}
      </span>
      <span className={done || active ? "text-ink-soft" : "text-muted/60"}>{label}</span>
    </li>
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
    <div className="mt-4 rounded-sm border border-line bg-paper-raised">
      <p className="border-b border-line px-3.5 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
        {sources.length} passage{sources.length === 1 ? "" : "s"} cited
      </p>
      <ul className="divide-y divide-line">
        {sources.map((source, index) => (
          <li key={source.id}>
            <button
              type="button"
              onClick={() => onSelect(source.documentId, source.page ?? null)}
              className="group flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-paper"
            >
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-xs border border-line font-mono text-[0.6rem] text-muted transition-colors group-hover:border-accent group-hover:text-accent">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                  <span className="min-w-0 truncate normal-case tracking-normal text-ink-soft">
                    {documentName(source.documentId)}
                  </span>
                  <span className="shrink-0">
                    {source.page ? `p.${source.page} · ` : ""}
                    {source.score.toFixed(2)}
                  </span>
                </span>
                <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted">
                  {source.content}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
