/**
 * STEGO-AE v1 shared contracts — FROZEN.
 *
 * These types are the agreement between the crypto/stego core, the media
 * adapters, the analysis layer and the UI. Do not change them without a
 * pull request and a peer review (PRD section 13).
 *
 * Reference: PRD sections 7 (payload format) and 8 (API and data model).
 */

export type Media = "image" | "audio";

/** Result of an extraction attempt. PASS/FAIL describe the message; ERROR is an execution failure. */
export type ExtractionStatus = "PASS" | "FAIL" | "ERROR" | "NOT_RUN";

export type TestKind = "baseline" | "jpeg" | "webp" | "flac" | "mp3";

/**
 * Quality metrics for a cover/stego pair.
 *
 * `psnrDb` is `null` when `identical` is true, because JSON must not carry
 * Infinity or NaN (PRD section 8). The UI renders the infinity symbol and the
 * XLSX writer renders the literal text `INF`.
 */
export interface Metrics {
  mse: number;
  psnrDb: number | null;
  identical: boolean;
}

/** One baseline or selected JPEG/WebP/FLAC/MP3 compression result. */
export interface TestResult {
  runId: string;
  media: Media;
  test: TestKind;
  /** Fixed codec setting (image quality, FLAC effort, MP3 bitrate), or `null`. */
  parameter: number | null;
  inputBytes: number;
  outputBytes: number | null;
  metrics: Metrics | null;
  pcmIdentical: boolean | null;
  extractionStatus: ExtractionStatus;
  elapsedMs: number;
  errorCode: string | null;
}

/* ------------------------------------------------------------------ */
/* Payload header (PRD section 7)                                      */
/* ------------------------------------------------------------------ */

export const MAGIC = "SGAE";
export const PROTOCOL_VERSION = 1;

export const KDF_ID_PBKDF2_SHA256 = 1;
export const KDF_ITERATIONS = 600_000;

export const HEADER_BYTES = 44;
/** The header occupies the first 352 carrier positions, 44 bytes of 8 bits. */
export const HEADER_CARRIER_BITS = HEADER_BYTES * 8;

export const SALT_BYTES = 16;
export const NONCE_BYTES = 12;
export const GCM_TAG_BYTES = 16;
export const KEY_BYTES = 32;

export const MEDIA_CODE = { image: 1, audio: 2 } as const;

export type MediaCode = (typeof MEDIA_CODE)[keyof typeof MEDIA_CODE];

export function mediaFromCode(code: number): Media | null {
  if (code === MEDIA_CODE.image) return "image";
  if (code === MEDIA_CODE.audio) return "audio";
  return null;
}

/** The 44 public, unencrypted bytes that bootstrap extraction. */
export interface PayloadHeader {
  version: number;
  mediaCode: MediaCode;
  kdfId: number;
  flags: number;
  iterations: number;
  /** UTF-8 byte length of the plaintext, before encryption. */
  ciphertextBytes: number;
  salt: Uint8Array;
  nonce: Uint8Array;
}

export type HeaderDecodeFailure =
  | "TOO_SHORT"
  | "BAD_MAGIC"
  | "BAD_VERSION"
  | "BAD_MEDIA"
  | "BAD_KDF"
  | "BAD_FLAGS"
  | "BAD_ITERATIONS"
  | "BAD_LENGTH";

export type HeaderDecodeResult =
  | { ok: true; header: PayloadHeader }
  | { ok: false; reason: HeaderDecodeFailure };

/* ------------------------------------------------------------------ */
/* Media carriers                                                      */
/* ------------------------------------------------------------------ */

/** Raw PNG pixels: 8-bit interleaved RGB or RGBA, row-major. Alpha is never used for LSB. */
export interface PngCarrier {
  width: number;
  height: number;
  channels: 3 | 4;
  data: Uint8Array;
}

/** Raw WAV PCM: signed 16-bit little-endian, interleaved by channel. */
export interface WavCarrier {
  sampleRate: number;
  channels: number;
  frames: number;
  samples: Int16Array;
}

export interface PngInfo {
  width: number;
  height: number;
  channels: 3 | 4;
  carrierCount: number;
  capacityBytes: number;
}

export interface WavInfo {
  sampleRate: number;
  channels: number;
  frames: number;
  bitDepth: 16;
  carrierCount: number;
  capacityBytes: number;
}

/** FLAC round-trip result: a TestResult plus the PCM16-LE integrity hashes. */
export interface FlacRoundTrip extends TestResult {
  sha256Before: string;
  sha256After: string;
}

/* ------------------------------------------------------------------ */
/* API payloads (PRD section 8)                                        */
/* ------------------------------------------------------------------ */

/** A binary result returned to the browser, base64 encoded for JSON transport. */
export interface Artifact {
  base64: string;
  mime: string;
  filename: string;
}

export interface ImageEmbedResponse {
  artifact: Artifact;
  metrics: Metrics;
  metadata: {
    width: number;
    height: number;
    channels: 3 | 4;
    messageBytes: number;
    coverBytes: number;
    stegoBytes: number;
  };
  thumbnail: string;
}

export interface AudioEmbedResponse {
  artifact: Artifact;
  metrics: Metrics;
  metadata: {
    sampleRate: number;
    channels: number;
    frames: number;
    messageBytes: number;
    coverBytes: number;
    stegoBytes: number;
  };
}

export interface ExtractResponse {
  text: string;
  messageBytes: number;
}

export interface ImageAnalyzeResponse {
  metrics: Metrics;
  histograms: {
    cover: RgbHistogram;
    stego: RgbHistogram;
  };
  lsbCombined: { cover: string; stego: string };
  lsbChannels: { cover: Record<ChannelName, string>; stego: Record<ChannelName, string> };
}

export type ChannelName = "r" | "g" | "b";

export type RgbHistogram = Record<ChannelName, number[]>;

export interface AudioAnalyzeResponse {
  metrics: Metrics;
  changedSamples: number;
  totalSamples: number;
  meanAbsoluteError: number;
  maxAbsoluteError: number;
  waveform: {
    cover: number[];
    stego: number[];
    changedRate: number[];
  };
}

/* ------------------------------------------------------------------ */
/* Shared limits (PRD section 4 and 7)                                 */
/* ------------------------------------------------------------------ */

export const LIMITS = {
  maxUploadBytes: 25 * 1024 * 1024,
  minMessageBytes: 1,
  maxMessageBytes: 32_768,
  minPassphraseChars: 0,
  maxPassphraseChars: 128,
  maxImageDimension: 1920,
  maxJsonResponseBytes: 4_000_000,
  maxThumbnailPx: 256,
  pcmPeak: 32_768,
  jpegQualities: [90, 70, 50],
  flacLevels: [0, 5, 8],
  datasetMessageSizes: [64, 512, 2048],
} as const;
