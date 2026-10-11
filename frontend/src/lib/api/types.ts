export type DocumentStatus = "UPLOADED" | "PROCESSING" | "READY" | "FAILED";

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  roles?: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  roleId?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  numberOfElements: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  firstPage: number;
  lastPage: number;
  prevPage: number | null;
  nextPage: number | null;
  sort: { field: string; direction: "asc" | "desc" } | null;
  links: { first: number; last: number; prev: number | null; next: number | null };
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface Document {
  id: string;
  name: string;
  description: string | null;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  processingError: string | null;
  pageCount: number | null;
  chunkCount: number | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  url?: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationAttachment {
  documentId: string;
  name: string;
  status: DocumentStatus;
}

export interface ConversationDetail extends Conversation {
  documents: ConversationAttachment[];
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  modelId: string | null;
  tokenCount: number;
  costUsd: number | null;
  createdAt: string;
}

export interface SearchChunk {
  id: string;
  documentId: string;
  index: number;
  content: string;
  page: number | null;
  tokenCount: number;
  score: number;
}

export type ChatEvent =
  | { type: "citations"; chunks: SearchChunk[] }
  | { type: "reasoning"; text: string }
  | { type: "content"; text: string }
  | {
      type: "done";
      messageId: string;
      finishReason: "STOP" | "LENGTH" | "ERROR";
      usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
    }
  | { type: "error"; message?: string };
