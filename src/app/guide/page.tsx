import type { Metadata } from "next";
import { PageHeader, Surface } from "@/components/layout/PageHeader";
import { TEAM } from "@/lib/nav";

export const metadata: Metadata = { title: "Guide & Team" };

const STEPS = [
  {
    step: "01",
    title: "Embed",
    body: "Choose supported media, write text, and set a passphrase. Download the stego file.",
  },
  {
    step: "02",
    title: "Extract",
    body: "Upload the unchanged stego file and enter its original passphrase to recover the text.",
  },
  {
    step: "03",
    title: "Evaluate",
    body: "Compare media quality and test compression. Export your observations as XLSX.",
  },
];

const FAQ = [
  {
    q: "Which formats are supported?",
    a: "PNG RGB/RGBA 8-bit up to 512 × 512, or short PCM16 WAV at 44.1 or 48 kHz. Maximum 1 MiB per file.",
  },
  {
    q: "Is my passphrase my account password?",
    a: "No. It protects the hidden message. Account authentication is not enabled in this demonstration.",
  },
  {
    q: "Why compare JPEG and FLAC?",
    a: "JPEG is lossy and may damage hidden bits. FLAC is lossless and should preserve PCM samples after decoding.",
  },
  {
    q: "What does high PSNR mean?",
    a: "The distortion is low. It is not proof that steganography is undetectable.",
  },
  {
    q: "Are files stored?",
    a: "No permanent storage or history. Core processing uses the server. Refreshing clears the temporary workspace.",
  },
];

export default function GuidePage() {
  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Understand the workflow."
        lead="A practical guide to STEGO-AE and the team behind it."
      />

      <div className="grid gap-4 min-[900px]:grid-cols-3">
        {STEPS.map((step) => (
          <Surface key={step.step}>
            <p className="font-mono text-[11px] text-muted">{step.step}</p>
            <h2 className="mt-2 text-heading">{step.title}</h2>
            <p className="mt-2 text-muted">{step.body}</p>
          </Surface>
        ))}
      </div>

      <Surface className="mt-6">
        <h2 className="text-heading">Before you begin</h2>
        <div className="mt-4 space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="rounded-control border border-line bg-canvas px-4 py-3">
              <summary className="cursor-pointer text-[15px]">{item.q}</summary>
              <p className="mt-2 text-[14px] text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </Surface>

      <h2 className="mt-8 mb-4 text-heading">Meet the team</h2>
      <div className="grid gap-4 min-[900px]:grid-cols-3">
        {TEAM.map((member) => (
          <Surface key={member.npm}>
            <div className="grid size-12 place-items-center rounded-control border border-accent text-xl text-accent">
              {member.initials}
            </div>
            <h3 className="mt-3 text-heading">{member.name}</h3>
            <p className="mt-1 text-[13px] text-muted">
              {member.npm}
              <br />
              Informatika · Universitas Siliwangi
            </p>
          </Surface>
        ))}
      </div>
    </>
  );
}
