"use client";

import { useState } from "react";
import { Button } from "@/components/forms/Button";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { MetricCard } from "@/components/analysis/MetricCard";
import { Waveform } from "@/components/analysis/Waveform";
import { AudioPreview } from "@/components/media/MediaPreview";
import { useSession } from "@/context/session";
import { analyzeAudio } from "@/lib/api/client";
import type { AudioAnalyzeResponse } from "@/lib/contracts/types";

export function AudioAnalysis() {
  const session = useSession();
  const [cover, setCover] = useState<File | null>(session.audio.cover);
  const [stego, setStego] = useState<File | null>(session.audio.stego);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AudioAnalyzeResponse | null>(null);

  const run = async () => {
    if (!cover || !stego) return;
    setProcessing(true);
    setError(null);
    try {
      setResult(await analyzeAudio(cover, stego));
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
        {[
          { label: "Original cover", file: cover, setFile: setCover, url: session.audio.coverUrl },
          { label: "Stego audio", file: stego, setFile: setStego, url: session.audio.stegoUrl },
        ].map((item) => (
          <div key={item.label} className="rounded-card border border-line bg-surface p-4">
            <h3 className="text-[13px] text-muted">{item.label}</h3>
            {item.url ? (
              <AudioPreview src={item.url} />
            ) : (
              <div className="grid h-20 place-items-center rounded-control border border-dashed border-line text-[12px] text-muted">
                No file selected
              </div>
            )}
            <label className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">
              Choose file
              <input
                type="file"
                accept="audio/wav"
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) item.setFile(selected);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <Button disabled={!cover || !stego || processing} onClick={run}>
        {processing ? "Analyzing…" : "Analyze pair"}
      </Button>

      {error ? <ErrorBanner message={error} /> : null}

      {metrics && result && (
        <>
          <div className="grid gap-3 min-[900px]:grid-cols-3">
            <MetricCard label="MSE" value={metrics.mse.toFixed(6)} />
            <MetricCard
              label="PSNR"
              value={metrics.psnrDb == null ? "∞" : `${metrics.psnrDb.toFixed(2)} dB`}
              hint="Reference peak: 32768"
            />
            <MetricCard
              label="Changed samples"
              value={`${result.changedSamples} / ${result.totalSamples}`}
            />
          </div>

          <div className="grid gap-4 min-[900px]:grid-cols-2">
            <div className="rounded-card border border-line bg-surface p-4">
              <h3 className="mb-2 text-[13px] text-muted">Cover waveform</h3>
              <Waveform values={result.waveform.cover} color="#AEB8C8" />
            </div>
            <div className="rounded-card border border-line bg-surface p-4">
              <h3 className="mb-2 text-[13px] text-muted">Stego waveform</h3>
              <Waveform values={result.waveform.stego} color="#E4BE70" />
            </div>
          </div>
          <p className="text-[12px] text-muted">
            Waveform is a visual overview only. Metrics use every PCM sample.
          </p>
        </>
      )}
    </div>
  );
}
