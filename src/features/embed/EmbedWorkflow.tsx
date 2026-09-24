"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/forms/Button";
import { Stepper } from "@/components/forms/Stepper";
import { FileUpload } from "@/components/forms/FileUpload";
import { PassphraseField } from "@/components/forms/PassphraseField";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { MetricCard } from "@/components/analysis/MetricCard";
import { AudioPreview, ImagePreview } from "@/components/media/MediaPreview";
import { useSession } from "@/context/session";
import { embedAudio, embedImage, inspectAudio, inspectImage } from "@/lib/api/client";
import { base64ToBlob, downloadBytes } from "@/lib/bytes";
import type { AudioEmbedResponse, ImageEmbedResponse } from "@/lib/contracts/types";

type Kind = "image" | "audio";

type EmbedResponse = ImageEmbedResponse | AudioEmbedResponse;

const STEPS = ["Choose media", "Write message", "Secure", "Result"];

export function EmbedWorkflow({ kind }: { kind: Kind }) {
  const router = useRouter();
  const session = useSession();

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [capacityBytes, setCapacityBytes] = useState<number | null>(null);
  const [mediaMeta, setMediaMeta] = useState<string>("");
  const [message, setMessage] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmbedResponse | null>(null);

  const isImage = kind === "image";
  const coverUrl = isImage ? session.image.coverUrl : session.audio.coverUrl;
  const stegoUrl = isImage ? session.image.stegoUrl : session.audio.stegoUrl;

  const messageBytes = useMemo(
    () => new TextEncoder().encode(message).length,
    [message],
  );

  const handleFile = async (selected: File) => {
    setFile(selected);
    setError(null);
    setResult(null);
    try {
      if (isImage) {
        const info = await inspectImage(selected);
        setCapacityBytes(info.capacityBytes);
        setMediaMeta(`${info.width} × ${info.height} · ${info.channels === 4 ? "RGBA" : "RGB"}`);
        session.setImageCover(selected);
      } else {
        const info = await inspectAudio(selected);
        setCapacityBytes(info.capacityBytes);
        setMediaMeta(`${info.sampleRate} Hz · ${info.channels === 1 ? "Mono" : "Stereo"}`);
        session.setAudioCover(selected);
      }
    } catch (err) {
      setCapacityBytes(null);
      setError(err instanceof Error ? err.message : "Could not inspect the file.");
    }
  };

  const canProceed = () => {
    if (step === 0) return file !== null && capacityBytes !== null;
    if (step === 1)
      return (
        messageBytes > 0 &&
        capacityBytes !== null &&
        messageBytes <= capacityBytes
      );
    if (step === 2)
      return (
        passphrase.length >= 12 && passphrase === confirm && confirm.length > 0
      );
    return false;
  };

  const run = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const response = isImage
        ? await embedImage(file, message, passphrase)
        : await embedAudio(file, message, passphrase);

      const blob = base64ToBlob(response.artifact.base64, response.artifact.mime);
      const stegoFile = new File([blob], response.artifact.filename, {
        type: response.artifact.mime,
      });
      if (isImage) session.setImageStego(stegoFile);
      else session.setAudioStego(stegoFile);

      setResult(response);
      setStep(3);
      setPassphrase("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Embedding failed.");
    } finally {
      setProcessing(false);
    }
  };

  const metrics = result?.metrics;

  return (
    <div>
      <Stepper steps={STEPS} current={step} />

      {error ? <div className="mb-4"><ErrorBanner message={error} /></div> : null}

      {step === 0 && (
        <FileUpload
          label={isImage ? "Choose a cover file" : "Choose a cover file"}
          accept={isImage ? "image/png" : "audio/wav"}
          hint={
            isImage
              ? "PNG · RGB / RGBA 8-bit · Up to 512 × 512"
              : "WAV · PCM 16-bit · Mono or stereo"
          }
          onFile={handleFile}
        />
      )}

      {step === 1 && (
        <div className="space-y-3">
          <label htmlFor="message" className="text-[13px] text-muted">
            Secret message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            className="w-full rounded-control border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted"
            placeholder="Write the text to hide."
          />
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span>{messageBytes} bytes used</span>
            <span>·</span>
            <span>{capacityBytes ?? 0} bytes available</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
            <div
              className="h-full bg-accent transition-all"
              style={{
                width: `${capacityBytes ? Math.min(100, (messageBytes / capacityBytes) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <PassphraseField
          id="embed-pass"
          value={passphrase}
          onChange={setPassphrase}
          confirm={confirm}
          onConfirmChange={setConfirm}
        />
      )}

      {step === 3 && result && (
        <div className="space-y-5">
          <div className="rounded-control border border-success/40 bg-success/10 px-4 py-3 text-[14px] text-success">
            Message embedded successfully.
          </div>
          <div className="grid gap-4 min-[900px]:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[13px] text-muted">Original cover</h3>
              {coverUrl &&
                (isImage ? (
                  <ImagePreview src={coverUrl} alt="Cover" />
                ) : (
                  <AudioPreview src={coverUrl} />
                ))}
            </div>
            <div>
              <h3 className="mb-2 text-[13px] text-muted">Stego {isImage ? "image" : "audio"}</h3>
              {stegoUrl &&
                (isImage ? (
                  <ImagePreview src={stegoUrl} alt="Stego" />
                ) : (
                  <AudioPreview src={stegoUrl} />
                ))}
            </div>
          </div>
          {metrics && (
            <div className="grid gap-3 min-[900px]:grid-cols-3">
              <MetricCard label="PSNR" value={metrics.psnrDb == null ? "∞" : `${metrics.psnrDb.toFixed(2)} dB`} />
              <MetricCard label="MSE" value={metrics.mse.toFixed(4)} />
              <MetricCard label="Payload" value={`${messageBytes} B`} />
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                result &&
                downloadBytes(
                  base64ToBlob(result.artifact.base64, result.artifact.mime),
                  result.artifact.filename,
                )
              }
            >
              Download {isImage ? "PNG" : "WAV"}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                router.push(isImage ? "/image/extract" : "/audio/extract")
              }
            >
              Try extraction →
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                router.push(isImage ? "/image/analysis" : "/audio/analysis")
              }
            >
              Open analysis
            </Button>
          </div>
        </div>
      )}

      {step < 3 && (
        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
              ← Back
            </Button>
          )}
          {step < 2 ? (
            <Button disabled={!canProceed()} onClick={() => setStep((s) => s + 1)}>
              Continue →
            </Button>
          ) : (
            <Button disabled={!canProceed() || processing} onClick={run}>
              {processing ? "Processing…" : "Embed message"}
            </Button>
          )}
        </div>
      )}

      {mediaMeta && step > 0 ? (
        <p className="mt-4 font-mono text-[12px] text-muted">{mediaMeta}</p>
      ) : null}
    </div>
  );
}
