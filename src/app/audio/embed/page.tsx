import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmbedWorkflow } from "@/features/embed/EmbedWorkflow";

export const metadata: Metadata = { title: "Audio Embedding" };

export default function AudioEmbedPage() {
  return (
    <>
      <PageHeader
        eyebrow="Audio / Embedding"
        title="Hide a message."
        lead="Encrypt your text and embed it in a WAV audio file."
      />
      <EmbedWorkflow kind="audio" />
    </>
  );
}
