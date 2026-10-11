import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/workspace";

export const instant = false;

export const metadata: Metadata = {
  title: "Workspace",
  description: "Read your documents and ask questions with citations.",
};

export default function WorkspacePage() {
  return <Workspace />;
}
