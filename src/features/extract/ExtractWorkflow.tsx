"use client";

import { useState } from "react";
import { Button } from "@/components/forms/Button";
import { Stepper } from "@/components/forms/Stepper";
import { FileUpload } from "@/components/forms/FileUpload";
import { PassphraseField } from "@/components/forms/PassphraseField";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useSession } from "@/context/session";
import { extractAudio, extractImage } from "@/lib/api/client";
import { downloadBytes } from "@/lib/bytes";

type Kind = "image" | "audio";

const STEPS = ["Choose media", "Passphrase", "Recovered text"];

export function ExtractWorkflow({ kind }: { kind: Kind }) {
  const session = useSession();
  const isImage = kind === "image";
  const stego = isImage ? session.image.stego : session.audio.stego;

  const [step, setStep] = useState<number>(() => (stego ? 1 : 0));
  const [file, setFile] = useState<File | null>(stego);
  const [passphrase, setPassphrase] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  const handleFile = (selected: File) => {
    setFile(selected);
    setText(null);
    setError(null);
  };

  const run = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const response = isImage
        ? await extractImage(file, passphrase)
        : await extractAudio(file, passphrase);
      setText(response.text);
      setStep(2);
      setPassphrase("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setProcessing(false);
    }
  };

  const copyText = async () => {
    if (text) await navigator.clipboard.writeText(text);
  };

  const downloadText = () => {
    if (text != null) {
      downloadBytes(
        new Blob([text], { type: "text/plain;charset=utf-8" }),
        "recovered.txt",
      );
    }
  };

  return (
    <div>
      <Stepper steps={STEPS} current={step} />

      {error ? <div className="mb-4"><ErrorBanner message={error} /></div> : null}

      {step === 0 && (
        <FileUpload
          label="Choose a stego file"
          accept={isImage ? "image/png" : "audio/wav"}
          hint={isImage ? "PNG · STEGO-AE payload" : "WAV · STEGO-AE payload"}
          onFile={handleFile}
        />
      )}

      {step === 1 && (
        <div className="max-w-md">
          <PassphraseField
            id="extract-pass"
            value={passphrase}
            onChange={setPassphrase}
            label="Passphrase"
            autoComplete="current-password"
          />
          <p className="mt-3 text-[12px] text-muted">
            Use the original passphrase. A damaged file can also prevent recovery.
          </p>
        </div>
      )}

      {step === 2 && text != null && (
        <div className="space-y-4">
          <div className="rounded-control border border-success/40 bg-success/10 px-4 py-3 text-[14px] text-success">
            Message recovered.
          </div>
          <label htmlFor="recovered" className="text-[13px] text-muted">
            Recovered text
          </label>
          <textarea
            id="recovered"
            readOnly
            value={text}
            rows={8}
            className="w-full rounded-control border border-line bg-canvas px-4 py-3 font-mono text-ink"
          />
          <div className="flex gap-3">
            <Button onClick={copyText}>Copy text</Button>
            <Button variant="secondary" onClick={downloadText}>
              Download TXT
            </Button>
          </div>
        </div>
      )}

      {step < 2 && (
        <div className="mt-6 flex gap-3">
          {step === 1 && (
            <Button variant="secondary" onClick={() => setStep(0)}>
              ← Back
            </Button>
          )}
          {step === 0 ? (
            <Button disabled={!file} onClick={() => setStep(1)}>
              Continue →
            </Button>
          ) : (
            <Button
              disabled={passphrase.length < 12 || processing}
              onClick={run}
            >
              {processing ? "Processing…" : "Extract message"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
