import type { Metadata } from "next";
import Link from "next/link";
import { Surface } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Home" };

const STEPS = [
  {
    step: "01",
    title: "Choose your media",
    body: "Start with a PNG image or a short PCM WAV audio file.",
    href: "/image/embed",
  },
  {
    step: "02",
    title: "Protect your message",
    body: "Write text and set a passphrase before embedding.",
    href: "/image/embed",
  },
  {
    step: "03",
    title: "Explore the evidence",
    body: "Recover your text, compare quality, and test compression.",
    href: "/image/analysis",
  },
];

export default function HomePage() {
  return (
    <>
      <div className="mb-8 grid gap-8 min-[900px]:grid-cols-[1.4fr_1fr] min-[900px]:items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-accent">
            Private messages. Ordinary media.
          </p>
          <h1 className="mt-3 text-[2rem] font-bold leading-[1.1] min-[900px]:text-[2.5rem]">
            Hidden in plain sight.
            <br />
            <span className="text-accent">Protected by design.</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Explore encrypted information hiding in images and audio. Embed a
            message, recover it, and measure what changes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/image/embed"
              className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 font-medium text-accent-ink hover:brightness-110"
            >
              Open image workspace →
            </Link>
            <Link
              href="/audio/embed"
              className="inline-flex min-h-[44px] items-center rounded-control border border-line px-5 hover:bg-raised"
            >
              Open audio workspace
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-muted">
            No account required · Files are not permanently stored
          </p>
        </div>
        <Surface className="grid place-items-center py-12">
          <span className="grid size-24 place-items-center rounded-[24px] border border-accent text-4xl text-accent">
            S
          </span>
          <p className="mt-5 font-mono text-[12px] text-muted">
            AES-256-GCM + keyed LSB
          </p>
        </Surface>
      </div>

      <div className="grid gap-4 min-[900px]:grid-cols-3">
        {STEPS.map((item) => (
          <Surface key={item.step}>
            <p className="font-mono text-[11px] text-muted">{item.step} / WORKFLOW</p>
            <h2 className="mt-2 text-heading">{item.title}</h2>
            <p className="mt-2 text-muted">{item.body}</p>
            <Link
              href={item.href}
              className="mt-4 inline-block text-[13px] text-accent hover:underline"
            >
              Continue →
            </Link>
          </Surface>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-heading">One message. Two media.</h2>
      <div className="grid gap-4 min-[900px]:grid-cols-2">
        <Surface>
          <span className="inline-flex rounded-full border border-[#64512d] bg-[#231f17] px-2.5 py-1 text-[11px] text-accent">
            IMAGE
          </span>
          <h3 className="mt-4 text-heading">Small changes, measurable results.</h3>
          <p className="mt-2 text-muted">
            PNG embedding, extraction, RGB histograms, enhanced LSB and JPEG
            compression tests.
          </p>
          <Link
            href="/image/analysis"
            className="mt-4 inline-block text-[13px] text-accent hover:underline"
          >
            Explore image tools →
          </Link>
        </Surface>
        <Surface>
          <span className="inline-flex rounded-full border border-[#64512d] bg-[#231f17] px-2.5 py-1 text-[11px] text-accent">
            AUDIO
          </span>
          <h3 className="mt-4 text-heading">Listen. Compare. Recover.</h3>
          <p className="mt-2 text-muted">
            WAV embedding, sample analysis and lossless FLAC round-trip
            verification.
          </p>
          <Link
            href="/audio/analysis"
            className="mt-4 inline-block text-[13px] text-accent hover:underline"
          >
            Explore audio tools →
          </Link>
        </Surface>
      </div>

      <p className="mt-8 rounded-card border border-line bg-raised p-4 text-[13px] text-muted">
        Your workspace is temporary. Download your results before refreshing or
        closing this tab. Processing uses the application server.
      </p>
    </>
  );
}
