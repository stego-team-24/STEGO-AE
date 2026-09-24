import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AudioCompression } from "@/features/compression/AudioCompression";

export const metadata: Metadata = { title: "Audio Lossless Compression Test" };

export default function AudioCompressionPage() {
  return (
    <>
      <PageHeader
        eyebrow="Audio / Compression"
        title="Lossless by design."
        lead="Verify message recovery through WAV → FLAC → WAV."
      />
      <AudioCompression />
    </>
  );
}
