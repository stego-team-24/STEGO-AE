import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExtractWorkflow } from "@/features/extract/ExtractWorkflow";

export const metadata: Metadata = { title: "Audio Extraction" };

export default function AudioExtractPage() {
  return (
    <>
      <PageHeader
        eyebrow="Audio / Extraction"
        title="Reveal the message."
        lead="Upload your stego WAV and enter its passphrase."
      />
      <ExtractWorkflow kind="audio" />
    </>
  );
}
