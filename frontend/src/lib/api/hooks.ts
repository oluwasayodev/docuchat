"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as conversationsApi from "@/lib/api/conversations";
import * as documentsApi from "@/lib/api/documents";
import type { Document } from "@/lib/api/types";

export const queryKeys = {
  documents: {
    root: ["documents"] as const,
    list: () => ["documents", "list"] as const,
    detail: (id: string) => ["documents", "detail", id] as const,
  },
  conversations: {
    root: ["conversations"] as const,
    list: () => ["conversations", "list"] as const,
    detail: (id: string) => ["conversations", "detail", id] as const,
    messages: (id: string) => ["conversations", "detail", id, "messages"] as const,
  },
};

export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents.list(),
    queryFn: ({ signal }) => documentsApi.listDocuments({ limit: 100, sortOrder: "desc" }, signal),
    refetchInterval: (query) => {
      const pending = query.state.data?.items.some(
        (document) => document.status === "UPLOADED" || document.status === "PROCESSING",
      );
      return pending ? 3000 : false;
    },
  });
}

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: queryKeys.documents.detail(id ?? ""),
    queryFn: ({ signal }) => documentsApi.getDocument(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) =>
      documentsApi.uploadDocument(file, { name: name ?? file.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.root });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.root });
    },
  });
}

export function useReprocessDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.reprocessDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.root });
    },
  });
}

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: ({ signal }) => conversationsApi.listConversations({ limit: 100 }, signal),
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(id ?? ""),
    queryFn: ({ signal }) => conversationsApi.getConversation(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useMessages(id: string | null) {
  return useQuery({
    queryKey: queryKeys.conversations.messages(id ?? ""),
    queryFn: ({ signal }) => conversationsApi.listMessages(id as string, 50, signal),
    enabled: Boolean(id),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => conversationsApi.createConversation(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => conversationsApi.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
    },
  });
}

export function useAttachDocuments(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentIds: string[]) =>
      conversationsApi.attachDocuments(conversationId as string, documentIds),
    onSuccess: () => {
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(conversationId),
        });
      }
    },
  });
}

export function useDetachDocument(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      conversationsApi.detachDocument(conversationId as string, documentId),
    onSuccess: () => {
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(conversationId),
        });
      }
    },
  });
}

export type { Document };
