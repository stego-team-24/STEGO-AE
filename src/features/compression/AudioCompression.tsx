"use client";

import { useState } from "react";
import { Button } from "@/components/forms/Button";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { ResultTable, type TableColumn } from "@/components/analysis/ResultTable";
import { useSession } from "@/context/session";
import { compressAudio } from "@/lib/api/client";
import { buildXlsx, saveBlob, xlsxFilename, type ExportRow } from "@/lib/export/xlsx";
import type { FlacRoundTrip } from "@/lib/contracts/types";

const LEVELS = [0, 5, 8];

const COLUMNS: TableColumn[] = [
  { key: "level", header: "Level" },
  { key: "flacBytes", header: "FLAC bytes" },
  { key: "sizeRatio", header: "Size ratio" },
  { key: "pcmIdentical", header: "PCM identical" },
  { key: "shaBefore", header: "SHA-256 before" },
  { key: "shaAfter", header: "SHA-256 after" },
  { key: "status", header: "Extraction" },
  { key: "elapsed", header: "Elapsed (ms)" },
];

function shortHash(value: string | null): string {
  if (!value) return "N/A";
  return `${value.slice(0, 10)}…`;
}

function statusLabel(status: FlacRoundTrip["extractionStatus"]): { text: string; className: string } {
  switch (status) {
    case "PASS":
      return { text: "PASS", className: "text-success" };
    case "FAIL":
      return { text: "FAIL", className: "text-error" };
    case "ERROR":
      return { text: "ERROR", className: "text-error" };
    default:
      return { text: status, className: "text-muted" };
  }
}

export function AudioCompression() {
  const session = useSession();
  const [file, setFile] = useState<File | null>(session.audio.stego);
  const [passphrase, setPassphrase] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FlacRoundTrip[]>([]);

  const run = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResults([]);
    try {
      for (const level of LEVELS) {
        const result = await compressAudio(file, passphrase, level);
        setResults((prev) => [...prev, result]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "FLAC test failed.");
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
      media: "audio",
      test: "flac",
      buildVersion: "0.1.0",
      environment: "demo",
      comparisonSource: "PCM before vs PCM after WAV → FLAC → WAV",
      parameters: { levels: LEVELS.join(","), passphrase: null },
      rows: exportRows(),
    });
    saveBlob(blob, xlsxFilename("audio", "flac"));
  };

  const rows = results.map((result) => {
    const status = statusLabel(result.extractionStatus);
    const ratio =
      result.outputBytes != null
        ? (result.outputBytes / result.inputBytes).toFixed(3)
        : "N/A";
    return {
      level: result.parameter ?? "N/A",
      flacBytes: result.outputBytes ?? "N/A",
      sizeRatio: ratio,
      pcmIdentical:
        result.pcmIdentical == null ? "N/A" : result.pcmIdentical ? "TRUE" : "FALSE",
      shaBefore: shortHash(result.sha256Before),
      shaAfter: shortHash(result.sha256After),
      status: <span className={status.className}>{status.text}</span>,
      elapsed: result.elapsedMs,
    };
  });

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface p-4">
        <label className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-line px-4 text-[13px] hover:bg-raised">
          Choose a stego WAV
          <input
            type="file"
            accept="audio/wav"
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
        <label htmlFor="flac-pass" className="text-[13px] text-muted">
          Passphrase
        </label>
        <input
          id="flac-pass"
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          autoComplete="current-password"
          placeholder="Required to verify extraction"
          className="mt-2 w-full rounded-control border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted"
        />
      </div>

      <p className="text-[12px] text-muted">
        FLAC compression levels 0, 5 and 8 are tested. FLAC is lossless: after a
        WAV → FLAC → WAV round-trip the PCM samples should be identical.
      </p>

      <Button disabled={!file || passphrase.length < 12 || processing} onClick={run}>
        {processing ? "Running…" : "Run lossless compression test"}
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
