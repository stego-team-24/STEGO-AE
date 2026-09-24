"use client";

import { useState } from "react";
import { Button } from "@/components/forms/Button";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { ResultTable, type TableColumn } from "@/components/analysis/ResultTable";
import { useSession } from "@/context/session";
import { compressImage } from "@/lib/api/client";
import { buildXlsx, saveBlob, xlsxFilename, type ExportRow } from "@/lib/export/xlsx";
import type { TestResult } from "@/lib/contracts/types";

const QUALITIES = [90, 70, 50];

const COLUMNS: TableColumn[] = [
  { key: "quality", header: "Quality" },
  { key: "sizeRatio", header: "Size ratio" },
  { key: "mse", header: "MSE" },
  { key: "psnr", header: "PSNR" },
  { key: "status", header: "Extraction" },
  { key: "elapsed", header: "Elapsed (ms)" },
];

function statusLabel(result: TestResult): { text: string; className: string } {
  switch (result.extractionStatus) {
    case "PASS":
      return { text: "PASS", className: "text-success" };
    case "FAIL":
      return { text: "FAIL", className: "text-error" };
    case "ERROR":
      return { text: "ERROR", className: "text-error" };
    default:
      return { text: result.extractionStatus, className: "text-muted" };
  }
}

export function ImageCompression() {
  const session = useSession();
  const [file, setFile] = useState<File | null>(session.image.stego);
  const [passphrase, setPassphrase] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);

  const run = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResults([]);
    try {
      for (const quality of QUALITIES) {
        const result = await compressImage(file, passphrase, quality);
        setResults((prev) => [...prev, result]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression test failed.");
    } finally {
      setProcessing(false);
    }
  };

  const exportRows = (): ExportRow[] =>
    results.map((result) => ({
      ...result,
      filename: file?.name ?? null,
      mediaMeta: null,
      messageBytes: null,
    }));

  const exportXlsx = async () => {
    const blob = await buildXlsx({
      media: "image",
      test: "jpeg",
      buildVersion: "0.1.0",
      environment: "demo",
      comparisonSource: "stego PNG vs JPEG decoded",
      parameters: { qualities: QUALITIES.join(","), passphrase: null },
      rows: exportRows(),
    });
    saveBlob(blob, xlsxFilename("image", "jpeg"));
  };

  const rows = results.map((result) => {
    const status = statusLabel(result);
    const ratio =
      result.outputBytes != null
        ? (result.outputBytes / result.inputBytes).toFixed(3)
        : "N/A";
    return {
      quality: result.parameter ?? "N/A",
      sizeRatio: ratio,
      mse: result.metrics ? result.metrics.mse.toFixed(4) : "N/A",
      psnr: result.metrics
        ? result.metrics.psnrDb == null
          ? "INF"
          : `${result.metrics.psnrDb.toFixed(2)} dB`
        : "N/A",
      status: <span className={status.className}>{status.text}</span>,
      elapsed: result.elapsedMs,
    };
  });

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-raised p-4 text-[13px] leading-relaxed text-muted">
        <h2 className="mb-2 text-[15px] font-medium text-ink">How this fragility test works</h2>
        <p>
          Your stego PNG is re-encoded as JPEG at three quality levels —{" "}
          <span className="text-ink">90</span> (high), <span className="text-ink">70</span>{" "}
          (medium) and <span className="text-ink">50</span> (low). Lower quality means a smaller
          file but more pixel changes. Each JPEG is decoded back to pixels, then the app tries to
          extract the hidden message and measures the damage.
        </p>
        <p className="mt-2">
          <span className="text-success">PASS</span> = the message survived compression.{" "}
          <span className="text-error">FAIL</span> = the message was destroyed — this is the{" "}
          <em>expected</em> result for LSB steganography, because JPEG changes the least
          significant bits the message lives in. <span className="text-error">ERROR</span> = a
          codec failure, not an experiment result.
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <label className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">
          Choose a stego PNG
          <input
            type="file"
            accept="image/png"
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) setFile(selected);
              event.target.value = "";
            }}
          />
        </label>
        {file ? (
          <p className="mt-2 truncate font-mono text-[11px] text-muted">{file.name}</p>
        ) : null}
      </div>

      <div className="max-w-md">
        <label htmlFor="compress-pass" className="text-[13px] text-muted">
          Passphrase
        </label>
        <input
          id="compress-pass"
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          autoComplete="current-password"
          placeholder="Required to verify extraction"
          className="mt-2 w-full rounded-control border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted"
        />
      </div>

      <div>
        <p className="mb-2 text-[13px] text-muted">JPEG quality</p>
        <p className="text-[12px] text-muted">All qualities 90, 70 and 50 are tested.</p>
      </div>

      <Button disabled={!file || passphrase.length < 12 || processing} onClick={run}>
        {processing ? "Running…" : "Run compression test"}
      </Button>

      {error ? <ErrorBanner message={error} /> : null}

      <div className="rounded-card border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-heading">Test results</h2>
          <Button variant="secondary" disabled={results.length === 0} onClick={exportXlsx}>
            Export XLSX
          </Button>
        </div>
        <ResultTable columns={COLUMNS} rows={rows} />
      </div>
    </div>
  );
}
