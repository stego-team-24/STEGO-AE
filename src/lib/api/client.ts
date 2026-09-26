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

export interface ExtractionProgress { completed: number; total: number; label: string }

async function postProgressForm<T>(url: string, form: FormData, onProgress: (progress: ExtractionProgress) => void): Promise<T> {
  const response = await fetch(`${url}?progress=1`, { method: "POST", body: form });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null) as { error?: { message?: string; code?: string } } | null;
    throw new ApiClientError(data?.error?.message ?? "Extraction failed.", data?.error?.code ?? null, null, response.status);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  const state: { result: T | null; error: { error?: { message?: string; code?: string } } | null } = { result: null, error: null };
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as {
      type: "progress" | "result" | "error";
      completed?: number;
      total?: number;
      label?: string;
      body?: T & { error?: { message?: string; code?: string } };
    };
    if (event.type === "progress" && event.completed !== undefined && event.total !== undefined && event.label) {
      onProgress({ completed: event.completed, total: event.total, label: event.label });
    } else if (event.type === "result") state.result = event.body ?? null;
    else if (event.type === "error") state.error = event.body ?? null;
  };
  while (true) {
    const { done, value } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) consume(line);
    if (done) break;
  }
  if (pending.trim()) consume(pending);
  if (state.error) throw new ApiClientError(state.error.error?.message ?? "Extraction failed.", state.error.error?.code ?? null, null, response.status);
  if (state.result === null) throw new ApiClientError("The server returned an invalid extraction response.", null, null, response.status);
  return state.result;
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

export function extractImage(file: File, passphrase: string, onProgress?: (progress: ExtractionProgress) => void) {
  const form = formWithFile(file, { passphrase });
  return onProgress
    ? postProgressForm<ExtractResponse>("/api/image/extract", form, onProgress)
    : postForm<ExtractResponse>("/api/image/extract", form);
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

export function extractAudio(file: File, passphrase: string, onProgress?: (progress: ExtractionProgress) => void) {
  const form = formWithFile(file, { passphrase });
  return onProgress
    ? postProgressForm<ExtractResponse>("/api/audio/extract", form, onProgress)
    : postForm<ExtractResponse>("/api/audio/extract", form);
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

export interface PublishProgress {
  phase: "encrypting" | "saving" | "complete";
  completed: number;
  total: number;
  clueNumber?: number;
}

export function publishMap(input: PublishInput, onProgress?: (progress: PublishProgress) => void) {
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
  return new Promise<{ id: string; title: string; clueCount: number }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/maps?progress=1");
    let consumedLength = 0;
    let pending = "";
    let result: { id?: string; title?: string; clueCount?: number } | null = null;
    let serverError: { error?: { message?: string; code?: string; field?: string } } | null = null;
    const consumeProgress = () => {
      const chunk = request.responseText.slice(consumedLength);
      consumedLength = request.responseText.length;
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line) continue;
        try {
          const event = JSON.parse(line) as {
            type: "progress" | "result" | "error";
            phase?: "encrypting" | "saving";
            completed?: number;
            total?: number;
            clueNumber?: number;
            body?: typeof result & typeof serverError;
          };
          if (event.type === "progress" && event.phase && event.completed !== undefined && event.total !== undefined) {
            onProgress?.({ phase: event.phase, completed: event.completed, total: event.total, clueNumber: event.clueNumber });
          } else if (event.type === "result") result = event.body ?? null;
          else if (event.type === "error") serverError = event.body ?? null;
        } catch {
          // Ignore incomplete/malformed stream chunks; the terminal response is validated below.
        }
      }
    };
    request.addEventListener("progress", consumeProgress);
    request.addEventListener("load", () => {
      try {
        consumeProgress();
        if (pending.trim()) {
          const event = JSON.parse(pending) as { type: string; body?: typeof result & typeof serverError };
          if (event.type === "result") result = event.body ?? null;
          if (event.type === "error") serverError = event.body ?? null;
        }
      } catch {
        reject(new Error("The server returned an invalid palace response."));
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new ApiClientError(serverError?.error?.message ?? "Request failed.", serverError?.error?.code ?? null, serverError?.error?.field ?? null, request.status));
        return;
      }
      if (serverError) {
        reject(new ApiClientError(serverError.error?.message ?? "Request failed.", serverError.error?.code ?? null, serverError.error?.field ?? null, 400));
        return;
      }
      if (!result?.id || !result.title || typeof result.clueCount !== "number") {
        reject(new Error("The server returned an invalid palace response."));
        return;
      }
      onProgress?.({ phase: "complete", completed: result.clueCount, total: result.clueCount });
      resolve({ id: result.id, title: result.title, clueCount: result.clueCount });
    });
    request.addEventListener("error", () => reject(new Error("Network request failed.")));
    request.addEventListener("abort", () => reject(new Error("Request was cancelled.")));
    request.send(form);
  });
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

export async function extractClue(id: string, passphrase: string, onProgress?: (progress: ExtractionProgress) => void): Promise<ExtractResponse> {
  const response = await fetch(`/api/clues/${id}/extract?progress=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passphrase }),
  });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null) as { error?: { message?: string; code?: string } } | null;
    throw new ApiClientError(data?.error?.message ?? "Extraction failed.", data?.error?.code ?? null, null, response.status);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  const streamResult: {
    result: ExtractResponse | null;
    failure: { error?: { message?: string; code?: string } } | null;
  } = { result: null, failure: null };
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as {
      type: "progress" | "result" | "error";
      completed?: number;
      total?: number;
      label?: string;
      body?: ExtractResponse & { error?: { message?: string; code?: string } };
    };
    if (event.type === "progress" && event.completed !== undefined && event.total !== undefined && event.label) {
      onProgress?.({ completed: event.completed, total: event.total, label: event.label });
    } else if (event.type === "result") streamResult.result = event.body ?? null;
    else if (event.type === "error") streamResult.failure = event.body ?? null;
  };
  while (true) {
    const { done, value } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) consume(line);
    if (done) break;
  }
  if (pending.trim()) consume(pending);
  if (streamResult.failure) throw new ApiClientError(streamResult.failure.error?.message ?? "Extraction failed.", streamResult.failure.error?.code ?? null, null, response.status);
  if (!streamResult.result) throw new ApiClientError("The server returned an invalid extraction response.", null, null, response.status);
  return streamResult.result;
}
