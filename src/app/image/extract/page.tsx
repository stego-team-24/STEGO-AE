import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExtractWorkflow } from "@/features/extract/ExtractWorkflow";

export const metadata: Metadata = { title: "Image Extraction" };

export default function ImageExtractPage() {
  return (
    <>
      <PageHeader
        eyebrow="Image / Extraction"
        title="Reveal the message."
        lead="Upload your stego media and enter its passphrase."
      />
      <ExtractWorkflow kind="image" />
    </>
  );
}
