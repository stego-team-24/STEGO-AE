/**
 * Browser-side API client for the STEGO-AE endpoints (PRD section 8).
 * Always posts multipart FormData; never writes bodies to logs or analytics.
 */

import type {
  AudioAnalyzeResponse,
  AudioEmbedResponse,
  ExtractResponse,
  ImageAnalyzeResponse,
  ImageEmbedResponse,
  Metrics,
  PngInfo,
  TestResult,
  WavInfo,
} from "@/lib/contracts/types";

export class ApiClientError extends Error {
  readonly code: string | null;
  readonly field: string | null;
  readonly status: number;

  constructor(message: string, code: string | null, field: string | null, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.field = field;
    this.status = status;
  }
}

async function postForm<T>(url: string, form: FormData): Promise<T> {
  const response = await fetch(url, { method: "POST", body: form });
  const data = (await response.json().catch(() => null)) as
    | { error?: { message?: string; code?: string; field?: string } }
    | null;

  if (!response.ok) {
    throw new ApiClientError(
      data?.error?.message ?? "Request failed.",
      data?.error?.code ?? null,
      data?.error?.field ?? null,
      response.status,
    );
  }

  return data as T;
}

function formWithFile(file: File, extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set("file", file);
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}

export interface MediaArtifact {
  name: string;
  mime: string;
  size: number;
  base64: string;
}

export function compressImageArtifact(file: File, format: "jpeg" | "webp") {
  return postForm<{ artifact: MediaArtifact; parameter: number; format: "jpeg" | "webp" }>("/api/image/pipeline/compress", formWithFile(file, { format }));
}

export function restoreImageArtifact(compressed: File, source: File) {
  const form = formWithFile(compressed);
  form.set("source", source);
  return postForm<{ artifact: MediaArtifact; metrics: Metrics }>("/api/image/pipeline/restore", form);
}

export function compressAudioArtifact(file: File, format: "flac" | "mp3") {
  return postForm<{ artifact: MediaArtifact; playback: MediaArtifact; parameter: number; format: "flac" | "mp3" }>("/api/audio/pipeline/compress", formWithFile(file, { format }));
}

export function restoreAudioArtifact(compressed: File, source: File) {
  const form = formWithFile(compressed);
  form.set("source", source);
  return postForm<{ artifact: MediaArtifact; metrics: Metrics; pcmIdentical: boolean }>("/api/audio/pipeline/restore", form);
}

export function inspectImage(file: File) {
  return postForm<PngInfo>("/api/image/inspect", formWithFile(file));
}

export function embedImage(file: File, message: string, passphrase: string) {
  return postForm<ImageEmbedResponse>(
    "/api/image/embed",
    formWithFile(file, { message, passphrase }),
  );
}

export function extractImage(file: File, passphrase: string) {
  return postForm<ExtractResponse>(
    "/api/image/extract",
    formWithFile(file, { passphrase }),
  );
}

export function analyzeImage(cover: File, stego: File) {
  const form = new FormData();
  form.set("cover", cover);
  form.set("stego", stego);
  return postForm<ImageAnalyzeResponse>("/api/image/analyze", form);
}

export function compressImage(file: File, passphrase: string, format: "jpeg" | "webp") {
  return postForm<TestResult>(
    "/api/image/compress",
    formWithFile(file, { passphrase, format }),
  );
}

export function inspectAudio(file: File) {
  return postForm<WavInfo>("/api/audio/inspect", formWithFile(file));
}

export function embedAudio(file: File, message: string, passphrase: string) {
  return postForm<AudioEmbedResponse>(
    "/api/audio/embed",
    formWithFile(file, { message, passphrase }),
  );
}

export function extractAudio(file: File, passphrase: string) {
  return postForm<ExtractResponse>(
    "/api/audio/extract",
    formWithFile(file, { passphrase }),
  );
}

export function compressAudio(file: File, passphrase: string, format: "flac" | "mp3") {
  return postForm<TestResult>(
    "/api/audio/flac",
    formWithFile(file, { passphrase, format }),
  );
}

export function analyzeAudio(cover: File, stego: File) {
  const form = new FormData();
  form.set("cover", cover);
  form.set("stego", stego);
  return postForm<AudioAnalyzeResponse>("/api/audio/analyze", form);
}

export interface MapSummary {
  id: string;
  title: string;
  authorName: string;
  gridSize: number;
  templateId: string;
  walls: [number, number][];
  entryBriefing: string;
  createdAt: string;
  clueCount: number;
  bestScore?: number | null;
  bestRank?: string | null;
}

export interface ClueDetail {
  id: string;
  nodeOrder: number;
  coordX: number;
  coordY: number;
  mediaType: "IMAGE" | "AUDIO";
  mediaUrl: string;
  coverMediaUrl: string;
  passphrase?: string;
  psnrDb: number | null;
  mse: number | null;
}

export interface MapDetail {
  id: string;
  title: string;
  authorName: string;
  gridSize: number;
  templateId: string;
  walls: [number, number][];
  entryBriefing: string;
  entranceX: number;
  entranceY: number;
  treasureX: number;
  treasureY: number;
  shadows: { x: number; y: number }[];
  createdAt: string;
  solvedMessages: Record<string, string>;
  solvedClueIds: string[];
  clues: ClueDetail[];
}

export interface ClueInput {
  nodeOrder: number;
  coordX: number;
  coordY: number;
  mediaType: "IMAGE" | "AUDIO";
  message: string;
  passphrase: string;
  cover: File;
}

export interface PublishInput {
  title: string;
  authorName: string;
  templateId: string;
  gridSize: number;
  walls: [number, number][];
  entryBriefing: string;
  entranceX: number;
  entranceY: number;
  treasureX: number;
  treasureY: number;
  shadows: { x: number; y: number }[];
  clues: ClueInput[];
}

export function publishMap(input: PublishInput) {
  const form = new FormData();
  form.set("title", input.title);
  form.set("authorName", input.authorName);
  form.set("templateId", input.templateId);
  form.set("gridSize", String(input.gridSize));
  form.set("walls", JSON.stringify(input.walls));
  form.set("entryBriefing", input.entryBriefing);
  form.set("entranceX", String(input.entranceX));
  form.set("entranceY", String(input.entranceY));
  form.set("treasureX", String(input.treasureX));
  form.set("treasureY", String(input.treasureY));
  form.set("shadows", JSON.stringify(input.shadows));
  form.set(
    "clues",
    JSON.stringify(
      input.clues.map((clue) => ({
        nodeOrder: clue.nodeOrder,
        coordX: clue.coordX,
        coordY: clue.coordY,
        mediaType: clue.mediaType,
        message: clue.message,
        passphrase: clue.passphrase,
      })),
    ),
  );
  input.clues.forEach((clue, index) => form.set(`cover_${index}`, clue.cover));
  return postForm<{ id: string; title: string; clueCount: number }>("/api/maps", form);
}

export async function fetchMap(id: string): Promise<MapDetail> {
  const response = await fetch(`/api/maps/${id}`);
  if (!response.ok) {
    throw new ApiClientError("Map not found.", null, null, response.status);
  }
  return (await response.json()) as MapDetail;
}

export async function fetchMapForensicPassphrases(id: string): Promise<Record<string, string>> {
  const response = await fetch(`/api/maps/${id}/forensic-passphrases`);
  if (!response.ok) throw new ApiClientError("Could not load saved asset passphrases.", null, null, response.status);
  const data = (await response.json()) as { passphrases: Record<string, string> };
  return data.passphrases;
}

export async function extractClue(id: string, passphrase: string): Promise<ExtractResponse> {
  const response = await fetch(`/api/clues/${id}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passphrase }),
  });
  const data = (await response.json().catch(() => null)) as
    | { error?: { message?: string; code?: string } }
    | null;
  if (!response.ok) {
    throw new ApiClientError(
      data?.error?.message ?? "Extraction failed.",
      data?.error?.code ?? null,
      null,
      response.status,
    );
  }
  return data as ExtractResponse;
}
