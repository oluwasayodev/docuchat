import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/workspace";

export const instant = false;

export const metadata: Metadata = {
  title: "Workspace",
  description: "Read your documents and ask questions with citations.",
};

interface WorkspacePageProps {
  searchParams: Promise<{ conversation?: string; document?: string; ask?: string }>;
}

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const { conversation, document, ask } = await searchParams;
  return (
    <Workspace
      initialConversationId={conversation ?? null}
      initialDocumentId={document ?? null}
      initialQuestion={ask ?? null}
    />
  );
}
