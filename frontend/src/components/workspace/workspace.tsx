"use client";

import { useState } from "react";
import { ConversationPanel } from "@/components/workspace/conversation-panel";
import { DocumentViewer } from "@/components/workspace/document-viewer";
import { Sidebar } from "@/components/workspace/sidebar";

export function Workspace() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentPage, setDocumentPage] = useState<number | null>(null);

  const focusSource = (id: string, page: number | null) => {
    setDocumentId(id);
    setDocumentPage(page);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-[1700px]">
      <Sidebar
        conversationId={conversationId}
        onSelectConversation={setConversationId}
        documentId={documentId}
        onSelectDocument={(id) => {
          setDocumentId(id);
          setDocumentPage(null);
        }}
      />
      <DocumentViewer
        documentId={documentId}
        page={documentPage}
        onPageChange={setDocumentPage}
      />
      <ConversationPanel
        key={conversationId ?? "none"}
        conversationId={conversationId}
        onFocusSource={focusSource}
      />
    </div>
  );
}
