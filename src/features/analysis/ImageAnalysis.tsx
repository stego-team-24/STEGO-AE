"use client";

import { useState } from "react";
import { Button } from "@/components/forms/Button";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { MetricCard } from "@/components/analysis/MetricCard";
import { HistogramChart } from "@/components/analysis/HistogramChart";
import { ImagePreview } from "@/components/media/MediaPreview";
import { useSession } from "@/context/session";
import { analyzeImage } from "@/lib/api/client";
import type { ChannelName, ImageAnalyzeResponse } from "@/lib/contracts/types";

const CHANNELS: { key: ChannelName; label: string }[] = [
  { key: "r", label: "Red" },
  { key: "g", label: "Green" },
  { key: "b", label: "Blue" },
];

function UploadRow({
  label,
  file,
  onFile,
  url,
}: {
  label: string;
  file: File | null;
  onFile: (file: File) => void;
  url: string | null;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h3 className="text-[13px] text-muted">{label}</h3>
      {url ? (
        <ImagePreview src={url} alt={label} />
      ) : (
        <div className="grid h-40 place-items-center rounded-control border border-dashed border-line text-[12px] text-muted">
          No file selected
        </div>
      )}
      <label className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">
        Choose file
        <input
          type="file"
          accept="image/png"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) onFile(selected);
            event.target.value = "";
          }}
        />
      </label>
      {file ? (
        <p className="mt-2 truncate font-mono text-[11px] text-muted">{file.name}</p>
      ) : null}
    </div>
  );
}

export function ImageAnalysis() {
  const session = useSession();
  const [cover, setCover] = useState<File | null>(session.image.cover);
  const [stego, setStego] = useState<File | null>(session.image.stego);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageAnalyzeResponse | null>(null);
  const [channel, setChannel] = useState<ChannelName>("b");
  const [lsbChannel, setLsbChannel] = useState<ChannelName>("b");

  const run = async () => {
    if (!cover || !stego) return;
    setProcessing(true);
    setError(null);
    try {
      setResult(await analyzeImage(cover, stego));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setProcessing(false);
    }
  };

  const metrics = result?.metrics;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 min-[900px]:grid-cols-2">
        <UploadRow
          label="Original cover"
          file={cover}
          onFile={setCover}
          url={session.image.coverUrl}
        />
        <UploadRow
          label="Stego image"
          file={stego}
          onFile={setStego}
          url={session.image.stegoUrl}
        />
      </div>

      <Button disabled={!cover || !stego || processing} onClick={run}>
        {processing ? "Analyzing…" : "Analyze pair"}
      </Button>

      {error ? <ErrorBanner message={error} /> : null}

      {metrics && (
        <div className="grid gap-3 min-[900px]:grid-cols-3">
          <MetricCard
            label="MSE"
            value={metrics.mse.toFixed(4)}
            hint={metrics.identical ? "Identical images" : undefined}
          />
          <MetricCard
            label="PSNR"
            value={metrics.psnrDb == null ? "∞" : `${metrics.psnrDb.toFixed(2)} dB`}
            hint="Reference peak: 255"
          />
          <MetricCard
            label="Message size"
            value={cover && stego ? "N/A" : "N/A"}
            hint="Analysis does not read the message"
          />
        </div>
      )}

      {result && (
        <>
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-heading">RGB histogram</h2>
              <select
                aria-label="Histogram channel"
                value={channel}
                onChange={(event) => setChannel(event.target.value as ChannelName)}
                className="rounded-control border border-line bg-canvas px-3 py-2 text-[13px]"
              >
                {CHANNELS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <HistogramChart
              cover={result.histograms.cover[channel]}
              stego={result.histograms.stego[channel]}
            />
            <p className="mt-2 text-[12px] text-muted">
              <span className="text-muted">━ Cover</span>{" "}
              <span className="text-accent">━ Stego</span>
            </p>
          </div>

          <div className="rounded-card border border-line bg-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-heading">Enhanced LSB</h2>
              <select
                aria-label="LSB channel"
                value={lsbChannel}
                onChange={(event) => setLsbChannel(event.target.value as ChannelName)}
                className="rounded-control border border-line bg-canvas px-3 py-2 text-[13px]"
              >
                {CHANNELS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 min-[900px]:grid-cols-2">
              <div>
                <p className="mb-2 text-[12px] text-muted">Cover</p>
                <ImagePreview
                  src={`data:image/png;base64,${result.lsbThumbnails.cover[lsbChannel]}`}
                  alt="Cover LSB plane"
                />
              </div>
              <div>
                <p className="mb-2 text-[12px] text-muted">Stego</p>
                <ImagePreview
                  src={`data:image/png;base64,${result.lsbThumbnails.stego[lsbChannel]}`}
                  alt="Stego LSB plane"
                />
              </div>
            </div>
            <p className="mt-3 text-[12px] text-muted">
              Each pixel is 0 or 255 from the least significant bit of the selected channel.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
