import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ForensicConsole } from "@/features/velvet/ForensicConsole";

export const metadata: Metadata = { title: "Velvet Room" };

export default function VelvetRoomPage() {
  return (
    <>
      <PageHeader
        eyebrow="Velvet Room"
        title="Forensic audit console."
        lead="Inspect map media, compare image signals, run JPEG or FLAC resilience checks, and export a forensic audit report."
      />
      <ForensicConsole />
    </>
  );
}
