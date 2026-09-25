/**
 * XLSX export (ExcelJS, lazy-loaded in the browser). Reference: PRD section 7 (F-07).
 *
 * Workbook sheets: Metadata, Results, Definitions. Numbers stay numeric, INF is
 * a string, unknown values are "N/A" (never 0), and no message, passphrase, key
 * or media binary is ever written.
 */

import ExcelJS from "exceljs";
import type { Media, TestKind, TestResult } from "@/lib/contracts/types";

export interface ExportRow extends TestResult {
  filename?: string | null;
  mediaMeta?: string | null;
  messageBytes?: number | null;
  compressedFilename?: string | null;
  compressedBytes?: number | null;
  restoredFilename?: string | null;
  restoredBytes?: number | null;
}

export interface XlsxOptions {
  media: Media;
  test: TestKind;
  buildVersion: string;
  environment: string;
  comparisonSource: string;
  parameters: Record<string, string | number | null>;
  rows: ExportRow[];
}

const NA = "N/A";
const INF = "INF";

function psnrCell(psnrDb: number | null | undefined): number | string {
  if (psnrDb == null) return INF;
  return psnrDb;
}

function numericCell(value: number | null | undefined): number | string {
  return value == null ? NA : value;
}

function ratioCell(inputBytes: number, outputBytes: number | null): number | string {
  if (outputBytes == null || inputBytes === 0) return NA;
  return outputBytes / inputBytes;
}

function safeText(value: string | null | undefined): string {
  if (value == null) return NA;
  return value;
}

function boolCell(value: boolean | null | undefined): string {
  if (value == null) return NA;
  return value ? "TRUE" : "FALSE";
}

export async function buildXlsx(options: XlsxOptions): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "STEGO-AE";
  workbook.created = new Date();

  const metadata = workbook.addWorksheet("Metadata");
  metadata.columns = [
    { header: "Key", key: "key", width: 24 },
    { header: "Value", key: "value", width: 48 },
  ];
  const now = new Date();
  const metaRows: [string, string | number][] = [
    ["App", "STEGO-AE"],
    ["Build version", options.buildVersion],
    ["UTC timestamp", now.toISOString()],
    ["WIB timestamp", now.toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })],
    ["Environment", options.environment],
    ["Media", options.media],
    ["Test", options.test],
    ["Comparison source", options.comparisonSource],
    ...Object.entries(options.parameters).map(([key, value]) => [
      `Parameter: ${key}`,
      value == null ? NA : value,
    ] as [string, string | number]),
  ];
  metaRows.forEach(([key, value]) => metadata.addRow({ key, value }));

  const results = workbook.addWorksheet("Results");
  results.columns = [
    { header: "run_id", key: "runId", width: 38 },
    { header: "media", key: "media", width: 10 },
    { header: "filename", key: "filename", width: 28 },
    { header: "compressed_file", key: "compressedFilename", width: 30 },
    { header: "compressed_bytes", key: "compressedBytes", width: 18 },
    { header: "restored_file", key: "restoredFilename", width: 30 },
    { header: "restored_bytes", key: "restoredBytes", width: 18 },
    { header: "media_meta", key: "mediaMeta", width: 26 },
    { header: "message_bytes", key: "messageBytes", width: 14 },
    { header: "test", key: "test", width: 12 },
    { header: "parameter", key: "parameter", width: 12 },
    { header: "input_bytes", key: "inputBytes", width: 12 },
    { header: "output_bytes", key: "outputBytes", width: 12 },
    { header: "size_ratio", key: "sizeRatio", width: 12 },
    { header: "mse", key: "mse", width: 14 },
    { header: "psnr_db", key: "psnrDb", width: 12 },
    { header: "pcm_identical", key: "pcmIdentical", width: 14 },
    { header: "extraction_status", key: "extractionStatus", width: 16 },
    { header: "elapsed_ms", key: "elapsedMs", width: 12 },
    { header: "error_code", key: "errorCode", width: 18 },
  ];

  for (const row of options.rows) {
    results.addRow({
      runId: safeText(row.runId),
      media: row.media,
      filename: safeText(row.filename),
      compressedFilename: safeText(row.compressedFilename),
      compressedBytes: numericCell(row.compressedBytes),
      restoredFilename: safeText(row.restoredFilename),
      restoredBytes: numericCell(row.restoredBytes),
      mediaMeta: safeText(row.mediaMeta),
      messageBytes: numericCell(row.messageBytes),
      test: row.test,
      parameter: numericCell(row.parameter),
      inputBytes: numericCell(row.inputBytes),
      outputBytes: numericCell(row.outputBytes),
      sizeRatio: ratioCell(row.inputBytes, row.outputBytes),
      mse: row.metrics ? numericCell(row.metrics.mse) : NA,
      psnrDb: row.metrics ? psnrCell(row.metrics.psnrDb) : NA,
      pcmIdentical: boolCell(row.pcmIdentical),
      extractionStatus: row.extractionStatus,
      elapsedMs: numericCell(row.elapsedMs),
      errorCode: safeText(row.errorCode),
    });
  }

  const definitions = workbook.addWorksheet("Definitions");
  definitions.columns = [
    { header: "Column", key: "column", width: 20 },
    { header: "Meaning", key: "meaning", width: 80 },
  ];
  const definitionsRows: [string, string][] = [
    ["run_id", "Unique identifier for one experiment row."],
    ["media", "image or audio."],
    ["filename", "Source media filename (a literal string, never a formula)."],
    ["compressed_file", "Intermediate compressed artifact produced by the selected attack."],
    ["compressed_bytes", "Compressed artifact size in bytes."],
    ["restored_file", "Restored PNG or WAV artifact used for the final extraction."],
    ["restored_bytes", "Restored artifact size in bytes."],
    ["media_meta", "Image dimensions or audio sample rate/channels/frames/bit depth."],
    ["message_bytes", "UTF-8 byte length of the embedded plaintext, when known."],
    ["test", "baseline, jpeg, webp, flac, or mp3."],
    ["parameter", "Fixed codec setting: JPEG/WebP quality, FLAC effort level, or MP3 bitrate."],
    ["input_bytes", "Size of the input media in bytes."],
    ["output_bytes", "Size of the output (JPEG, WebP, FLAC, or MP3) media in bytes."],
    ["size_ratio", "output_bytes / input_bytes."],
    ["mse", "Mean squared error. 0 means identical."],
    ["psnr_db", "Peak signal-to-noise ratio in dB. INF means identical."],
    ["pcm_identical", "Audio only: whether PCM samples are byte-identical after round-trip."],
    ["extraction_status", "PASS, FAIL (message), ERROR (execution), or NOT_RUN."],
    ["elapsed_ms", "Wall time of the experiment step in milliseconds."],
    ["error_code", "Machine-readable error code, or N/A."],
  ];
  definitionsRows.forEach(([column, meaning]) => definitions.addRow({ column, meaning }));

  const data = await workbook.xlsx.writeBuffer();
  const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  // writeBuffer resolves to an ArrayBuffer in the browser build and a Buffer
  // (Uint8Array) in the Node build — normalize both into a Blob.
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return new Blob([data], { type: mime });
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    const copy = new Uint8Array(view.byteLength);
    copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    return new Blob([copy], { type: mime });
  }
  return new Blob([data as BlobPart], { type: mime });
}

function timestampToken(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function xlsxFilename(media: Media, test: TestKind, date = new Date()): string {
  return `stego-ae_${media}_${test}_${timestampToken(date)}.xlsx`;
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick — revoking synchronously can abort the download
  // and leave an empty file in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
