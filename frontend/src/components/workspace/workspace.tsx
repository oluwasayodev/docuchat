"use client";

import { useState } from "react";
import { ConversationPanel } from "@/components/workspace/conversation-panel";
import { DocumentViewer } from "@/components/workspace/document-viewer";
import { Sidebar } from "@/components/workspace/sidebar";
import { WorkspaceAsk } from "@/components/workspace/workspace-ask";

interface WorkspaceProps {
  initialConversationId?: string | null;
  initialDocumentId?: string | null;
  initialQuestion?: string | null;
}

export function Workspace({
  initialConversationId = null,
  initialDocumentId = null,
  initialQuestion = null,
}: WorkspaceProps) {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [documentId, setDocumentId] = useState<string | null>(initialDocumentId);
  const [documentPage, setDocumentPage] = useState<number | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(initialQuestion);

  const focusSource = (id: string, page: number | null) => {
    setDocumentId(id);
    setDocumentPage(page);
  };

  const askWorkspace = (id: string, question: string) => {
    setPendingQuestion(question);
    setConversationId(id);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-[1700px] flex-col">
      <WorkspaceAsk onAsk={askWorkspace} />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          conversationId={conversationId}
          onSelectConversation={(id) => {
            setPendingQuestion(null);
            setConversationId(id);
          }}
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
          initialQuestion={pendingQuestion}
          onInitialQuestionConsumed={() => setPendingQuestion(null)}
          onFocusSource={focusSource}
        />
      </div>
    </div>
  );
}
