"use client";

import { useState } from "react";
import { Button } from "@/components/forms/Button";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { ResultTable, type TableColumn } from "@/components/analysis/ResultTable";
import { embedImage } from "@/lib/api/client";
import { buildXlsx, saveBlob, xlsxFilename, type ExportRow } from "@/lib/export/xlsx";

const MESSAGE_SIZES = [64, 512, 2048];
const MAX_IMAGES = 5;
const PASSPHRASE = "dataset-evaluation-passphrase";

const COLUMNS: TableColumn[] = [
  { key: "filename", header: "Image" },
  { key: "dimensions", header: "Dimensions" },
  { key: "messageBytes", header: "Message (B)" },
  { key: "mse", header: "MSE" },
  { key: "psnr", header: "PSNR (dB)" },
  { key: "status", header: "Status" },
];

interface DatasetRow {
  filename: string;
  width: number;
  height: number;
  messageBytes: number;
  mse: number;
  psnrDb: number | null;
  stegoBytes: number;
  status: "PASS" | "ERROR";
  errorCode: string | null;
}

function fixtureMessage(bytes: number): string {
  const base =
    "STEGO-AE dataset message. The quick brown fox jumps over the lazy dog. 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ. ";
  let out = "";
  while (new TextEncoder().encode(out).length < bytes) out += base;
  return out.slice(0, bytes);
}

export function DatasetEvaluation() {
  const [images, setImages] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DatasetRow[]>([]);

  const run = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setError(null);
    setResults([]);

    try {
      for (const image of images) {
        for (const size of MESSAGE_SIZES) {
          try {
            const response = await embedImage(image, fixtureMessage(size), PASSPHRASE);
            setResults((prev) => [
              ...prev,
              {
                filename: image.name,
                width: response.metadata.width,
                height: response.metadata.height,
                messageBytes: size,
                mse: response.metrics.mse,
                psnrDb: response.metrics.psnrDb,
                stegoBytes: response.metadata.stegoBytes,
                status: "PASS",
                errorCode: null,
              },
            ]);
          } catch (err) {
            setResults((prev) => [
              ...prev,
              {
                filename: image.name,
                width: 0,
                height: 0,
                messageBytes: size,
                mse: 0,
                psnrDb: null,
                stegoBytes: 0,
                status: "ERROR",
                errorCode: err instanceof Error ? err.message : "Embed failed",
              },
            ]);
          }
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const exportRows = (): ExportRow[] =>
    results.map((row) => ({
      runId: `${row.filename}-${row.messageBytes}`,
      media: "image",
      test: "baseline",
      parameter: row.messageBytes,
      inputBytes: 0,
      outputBytes: row.stegoBytes || null,
      metrics: row.status === "PASS" ? { mse: row.mse, psnrDb: row.psnrDb, identical: row.mse === 0 } : null,
      pcmIdentical: null,
      extractionStatus: row.status,
      elapsedMs: 0,
      errorCode: row.errorCode,
      filename: row.filename,
      mediaMeta: `${row.width} × ${row.height}`,
      messageBytes: row.messageBytes,
    }));

  const exportXlsx = async () => {
    const blob = await buildXlsx({
      media: "image",
      test: "baseline",
      buildVersion: "0.1.0",
      environment: "demo",
      comparisonSource: "cover vs stego, 5 images × 3 message sizes",
      parameters: { messageSizes: MESSAGE_SIZES.join(",") },
      rows: exportRows(),
    });
    saveBlob(blob, xlsxFilename("image", "baseline"));
  };

  const rows = results.map((row) => ({
    filename: row.filename,
    dimensions: row.width ? `${row.width} × ${row.height}` : "N/A",
    messageBytes: row.messageBytes,
    mse: row.status === "PASS" ? row.mse.toFixed(6) : "N/A",
    psnr: row.status === "PASS" ? (row.psnrDb == null ? "INF" : `${row.psnrDb.toFixed(2)} dB`) : "N/A",
    status: row.status === "PASS" ? <span className="text-success">PASS</span> : <span className="text-error">ERROR</span>,
  }));

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-heading">Dataset evaluation</h2>
          <p className="mt-1 text-[13px] text-muted">
            5 cover images × 3 message sizes ({MESSAGE_SIZES.join(", ")} bytes) = 15 baseline runs,
            with MSE and PSNR for each.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">
          BATCH
        </span>
      </div>

      <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">
        Choose up to {MAX_IMAGES} images
        <input
          type="file"
          accept="image/png"
          multiple
          className="hidden"
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []).slice(0, MAX_IMAGES);
            setImages(selected);
            setResults([]);
            event.target.value = "";
          }}
        />
      </label>

      {images.length > 0 ? (
        <p className="mt-2 font-mono text-[11px] text-muted">
          {images.map((image) => image.name).join(", ")}
        </p>
      ) : null}

      <div className="mt-4 flex gap-3">
        <Button disabled={images.length === 0 || processing} onClick={run}>
          {processing ? "Running 15 embeddings…" : "Run dataset"}
        </Button>
        <Button variant="secondary" disabled={results.length === 0} onClick={exportXlsx}>
          Export XLSX
        </Button>
      </div>

      {error ? <div className="mt-3"><ErrorBanner message={error} /></div> : null}

      {results.length > 0 ? (
        <div className="mt-4">
          <ResultTable columns={COLUMNS} rows={rows} />
        </div>
      ) : null}
    </div>
  );
}
