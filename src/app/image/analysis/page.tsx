import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImageAnalysis } from "@/features/analysis/ImageAnalysis";
import { DatasetEvaluation } from "@/features/analysis/DatasetEvaluation";

export const metadata: Metadata = { title: "Image Analysis Lab" };

export default function ImageAnalysisPage() {
  return (
    <>
      <PageHeader
        eyebrow="Image / Analysis Lab"
        title="Measure what changes."
        lead="Inspect distortion, color distribution and the least significant bits."
      />
      <div className="space-y-6">
        <ImageAnalysis />
        <DatasetEvaluation />
      </div>
    </>
  );
}
