import { apiFetch, streamSse } from "@/lib/api/client";
import type {
  ChatEvent,
  Conversation,
  ConversationAttachment,
  ConversationDetail,
  Message,
  Page,
} from "@/lib/api/types";

export interface ConversationListParams {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function listConversations(
  params: ConversationListParams = {},
  signal?: AbortSignal,
): Promise<Page<Conversation>> {
  return apiFetch<Page<Conversation>>(`/conversations${toQuery({ ...params })}`, { signal });
}

export function getConversation(id: string, signal?: AbortSignal): Promise<ConversationDetail> {
  return apiFetch<ConversationDetail>(`/conversations/${id}`, { signal });
}

export function createConversation(title?: string): Promise<Conversation> {
  return apiFetch<Conversation>("/conversations", {
    method: "POST",
    body: title ? { title } : {},
  });
}

export function renameConversation(id: string, title: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/conversations/${id}`, { method: "PATCH", body: { title } });
}

export function deleteConversation(id: string): Promise<void> {
  return apiFetch<void>(`/conversations/${id}`, { method: "DELETE" });
}

export function listMessages(
  id: string,
  limit?: number,
  signal?: AbortSignal,
): Promise<Message[]> {
  return apiFetch<Message[]>(`/conversations/${id}/messages${toQuery({ limit })}`, { signal });
}

export function attachDocuments(
  id: string,
  documentIds: string[],
): Promise<ConversationAttachment[]> {
  return apiFetch<ConversationAttachment[]>(`/conversations/${id}/documents`, {
    method: "POST",
    body: { documentIds },
  });
}

export function detachDocument(id: string, documentId: string): Promise<void> {
  return apiFetch<void>(`/conversations/${id}/documents/${documentId}`, { method: "DELETE" });
}

export interface StreamChatInput {
  question: string;
  modelId?: string;
}

export async function* streamChat(
  conversationId: string,
  input: StreamChatInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const frames = streamSse(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: input,
    headers: { Accept: "text/event-stream" },
    signal,
  });

  for await (const frame of frames) {
    if (frame.event === "error") {
      let message = "The response stream failed.";
      try {
        const parsed: unknown = JSON.parse(frame.data);
        if (typeof parsed === "string") message = parsed;
      } catch {
        void 0;
      }
      yield { type: "error", message };
      continue;
    }
    try {
      yield JSON.parse(frame.data) as ChatEvent;
    } catch {
      void 0;
    }
  }
}
