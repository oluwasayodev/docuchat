"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  attachDocuments,
  createConversation,
  deleteConversation,
  streamChat,
} from "@/lib/api/conversations";
import { queryKeys, useDocuments } from "@/lib/api/hooks";
import type { SearchChunk } from "@/lib/api/types";
import {
  DocumentResultCard,
  type DocumentMatch,
} from "@/components/home/document-result-card";

type Phase = "idle" | "searching" | "done" | "error";

const EXAMPLES = [
  "What is this collection about?",
  "Summarize the key findings.",
  "Which document discusses methodology?",
];

export function HomeAsk() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const documents = useDocuments();

  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [citations, setCitations] = useState<SearchChunk[]>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const readyDocuments = useMemo(
    () => (documents.data?.items ?? []).filter((document) => document.status === "READY"),
    [documents.data],
  );

  const runSearch = useCallback(
    async (question: string) => {
      if (!question || readyDocuments.length === 0) return;

      setAsked(question);
      setPhase("searching");
      setCitations([]);
      setAnswer("");
      setError(null);
      setSelected(new Set());

      const controller = new AbortController();
      abortRef.current = controller;
      let conversationId: string | null = null;

      try {
        const created = await createConversation(question.slice(0, 80));
        conversationId = created.id;
        await attachDocuments(
          created.id,
          readyDocuments.map((document) => document.id),
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });

        for await (const event of streamChat(created.id, { question }, controller.signal)) {
          if (controller.signal.aborted) break;
          if (event.type === "citations") {
            setCitations(event.chunks);
          } else if (event.type === "content") {
            setAnswer((prev) => prev + event.text);
          } else if (event.type === "error") {
            setError(event.message ?? "The search failed.");
            setPhase("error");
          } else if (event.type === "done") {
            setPhase("done");
          }
        }
        setPhase((prev) => (prev === "error" ? prev : "done"));
      } catch {
        if (!controller.signal.aborted) {
          setError("The search could not be completed.");
          setPhase("error");
        }
      } finally {
        abortRef.current = null;
        if (conversationId) {
          deleteConversation(conversationId)
            .catch(() => undefined)
            .finally(() =>
              queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
            );
        }
      }
    },
    [readyDocuments, queryClient],
  );

  const matches = useMemo<DocumentMatch[]>(() => {
    const grouped = new Map<string, SearchChunk[]>();
    for (const chunk of citations) {
      const list = grouped.get(chunk.documentId);
      if (list) list.push(chunk);
      else grouped.set(chunk.documentId, [chunk]);
    }

    const byId = new Map((documents.data?.items ?? []).map((document) => [document.id, document]));
    const result: DocumentMatch[] = [];
    for (const [documentId, chunks] of grouped) {
      const document = byId.get(documentId);
      if (!document) continue;
      const bestScore = Math.max(...chunks.map((chunk) => chunk.score));
      const pages = Array.from(
        new Set(
          chunks
            .map((chunk) => chunk.page)
            .filter((page): page is number => page !== null),
        ),
      ).sort((a, b) => a - b);
      result.push({ document, chunks, bestScore, pages });
    }

    return result.sort((a, b) => b.bestScore - a.bestScore).slice(0, 6);
  }, [citations, documents.data]);

  const submit = () => {
    const question = draft.trim();
    if (!question || readyDocuments.length === 0 || phase === "searching") return;
    setDraft("");
    void runSearch(question);
  };

  const toggleSelect = (documentId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      return next;
    });

  const startConversation = useMutation({
    mutationFn: async () => {
      const created = await createConversation((asked ?? "Selected documents").slice(0, 80));
      await attachDocuments(created.id, Array.from(selected));
      return created.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
      const ask = asked ? `&ask=${encodeURIComponent(asked)}` : "";
      router.push(`/app/workspace?conversation=${id}${ask}`);
    },
  });

  const openDocument = (documentId: string) => {
    router.push(`/app/workspace?document=${documentId}`);
  };

  const canAsk = readyDocuments.length > 0 && phase !== "searching";

  return (
    <div>
      <div className="mx-auto w-full max-w-[640px]">
        <div className="rounded-[14px] border border-line bg-paper-raised p-2 shadow-[0_1px_2px_rgba(30,28,20,0.05),0_12px_34px_-18px_rgba(30,28,20,0.30)]">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={2}
            disabled={!canAsk}
            placeholder={
              documents.isPending
                ? "Loading documents…"
                : readyDocuments.length === 0
                  ? "Upload a document to begin"
                  : "Ask a question across your documents…"
            }
            className="block w-full resize-none border-0 bg-transparent px-3 pb-1 pt-3 font-serif text-[17px] leading-[1.45] text-ink outline-none placeholder:text-muted/70 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-3 px-1.5 pb-1 pt-0.5">
            <span className="truncate pl-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
              {readyDocuments.length} ready document{readyDocuments.length === 1 ? "" : "s"}
            </span>
            {phase === "searching" ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                aria-label="Stop searching"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-ink text-paper transition-colors hover:bg-accent"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canAsk || !draft.trim()}
                aria-label="Search documents"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-ink text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-paper-raised"
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
        <p className="mt-2 text-center text-[11.5px] text-muted/80">
          Enter to search · Shift + Enter for a new line
        </p>
      </div>

      {phase === "idle" ? (
        <div className="mx-auto mt-6 flex max-w-[640px] flex-wrap justify-center gap-2.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setDraft(example);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-line bg-paper-raised px-4 py-2 font-serif text-sm text-ink-soft transition-colors hover:border-accent hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      {phase !== "idle" ? (
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
              {matches.length > 0
                ? `${matches.length} document${matches.length === 1 ? "" : "s"} matched`
                : phase === "searching"
                  ? "Searching…"
                  : "No documents matched"}
            </h2>
            {asked ? (
              <p className="min-w-0 truncate font-serif text-sm italic text-muted">“{asked}”</p>
            ) : null}
          </div>

          {matches.length > 0 ? (
            <div className="mt-5 grid justify-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((match) => (
                <DocumentResultCard
                  key={match.document.id}
                  match={match}
                  selected={selected.has(match.document.id)}
                  onToggleSelect={toggleSelect}
                  onOpen={openDocument}
                />
              ))}
            </div>
          ) : phase === "searching" ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-[340px] animate-pulse rounded-sm border border-line bg-paper-raised"
                />
              ))}
            </div>
          ) : null}

          {error ? (
            <p className="mt-6 rounded-sm border border-accent/40 bg-accent-soft/60 px-4 py-3 text-sm text-accent">
              {error}
            </p>
          ) : null}

          {answer || phase === "searching" ? (
            <div className="mt-8 rounded-sm border border-line bg-paper-raised p-5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                Answer
              </p>
              <p className="mt-3 whitespace-pre-wrap font-serif text-[0.98rem] leading-[1.75] text-ink">
                {answer}
                {phase === "searching" ? (
                  <span className="ml-0.5 inline-block h-[1.05em] w-1.5 translate-y-[0.15em] animate-pulse bg-accent align-baseline" />
                ) : null}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-full border border-line bg-paper-raised py-2 pl-5 pr-2 shadow-[0_10px_30px_-10px_rgba(30,28,20,0.35)]">
            <span className="text-sm text-ink-soft">{selected.size} selected</span>
            <button
              type="button"
              onClick={() => startConversation.mutate()}
              disabled={startConversation.isPending}
              className="rounded-full bg-ink px-4 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-paper transition-colors hover:bg-accent disabled:opacity-60"
            >
              {startConversation.isPending ? "Starting…" : "Start conversation →"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
