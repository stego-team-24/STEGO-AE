/**
 * Browser-side API client for the STEGO-AE endpoints (PRD section 8).
 * Always posts multipart FormData; never writes bodies to logs or analytics.
 */

import type {
  AudioAnalyzeResponse,
  AudioEmbedResponse,
  ExtractResponse,
  FlacRoundTrip,
  ImageAnalyzeResponse,
  ImageEmbedResponse,
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

export function compressImage(file: File, passphrase: string, quality: number) {
  return postForm<TestResult>(
    "/api/image/compress",
    formWithFile(file, { passphrase, quality: String(quality) }),
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

export function compressAudio(file: File, passphrase: string, level: number) {
  return postForm<FlacRoundTrip>(
    "/api/audio/flac",
    formWithFile(file, { passphrase, level: String(level) }),
  );
}

export function analyzeAudio(cover: File, stego: File) {
  const form = new FormData();
  form.set("cover", cover);
  form.set("stego", stego);
  return postForm<AudioAnalyzeResponse>("/api/audio/analyze", form);
}
