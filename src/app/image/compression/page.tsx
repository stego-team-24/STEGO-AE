import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImageCompression } from "@/features/compression/ImageCompression";

export const metadata: Metadata = { title: "Image Compression Attack" };

export default function ImageCompressionPage() {
  return (
    <>
      <PageHeader
        eyebrow="Image / Compression Attack"
        title="Put the message to the test."
        lead="Observe how JPEG compression affects your hidden message."
      />
      <ImageCompression />
    </>
  );
}
