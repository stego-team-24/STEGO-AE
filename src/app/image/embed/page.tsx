import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmbedWorkflow } from "@/features/embed/EmbedWorkflow";

export const metadata: Metadata = { title: "Image Embedding" };

export default function ImageEmbedPage() {
  return (
    <>
      <PageHeader
        eyebrow="Image / Embedding"
        title="Hide a message."
        lead="Encrypt your text and embed it in a PNG image."
      />
      <EmbedWorkflow kind="image" />
    </>
  );
}
