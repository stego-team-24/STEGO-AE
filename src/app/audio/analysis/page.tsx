import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AudioAnalysis } from "@/features/analysis/AudioAnalysis";

export const metadata: Metadata = { title: "Audio Analysis Lab" };

export default function AudioAnalysisPage() {
  return (
    <>
      <PageHeader
        eyebrow="Audio / Analysis Lab"
        title="Measure what changes."
        lead="Compare PCM samples before and after embedding."
      />
      <AudioAnalysis />
    </>
  );
}
