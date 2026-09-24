import crypto from "node:crypto";
import type { FlacRoundTrip, Metrics, WavCarrier } from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";
import {
  flacLevelSchema,
  parseOrThrow,
  passphraseSchema,
  readField,
} from "@/lib/contracts/schemas";
import { decodeWav } from "@/lib/media/wav";
import { flacRoundTrip } from "@/lib/media/flac";
import { audioMetrics, samplesIdentical } from "@/lib/analysis/audio";
import { extractAudioPayload } from "@/lib/engine/extract";
import { createRunId, jsonOk, readUpload, runHandler } from "@/lib/api/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const { bytes } = await readUpload(form);
    const passphrase = parseOrThrow(
      passphraseSchema,
      readField(form, "passphrase"),
      "passphrase",
    );
    const level = parseOrThrow(flacLevelSchema, readField(form, "level"), "level");

    const cover = decodeWav(bytes);

    // Baseline must pass first so the round-trip result is meaningful.
    extractAudioPayload(cover, passphrase);

    const started = performance.now();
    let outputBytes: number | null = null;
    let metrics: Metrics | null = null;
    let pcmIdentical: boolean | null = null;
    let status: FlacRoundTrip["extractionStatus"] = "NOT_RUN";
    let errorCode: string | null = null;
    let sha256Before = "";
    let sha256After = "";

    const pcmHash = (samples: Int16Array) =>
      crypto
        .createHash("sha256")
        .update(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength))
        .digest("hex");

    try {
      sha256Before = pcmHash(cover.samples);
      const { flacBytes, decoded } = await flacRoundTrip(
        cover.samples,
        cover.sampleRate,
        cover.channels,
        16,
        level,
      );
      outputBytes = flacBytes.length;
      sha256After = pcmHash(decoded);
      pcmIdentical = samplesIdentical(cover.samples, decoded);

      const decodedCarrier: WavCarrier = {
        sampleRate: cover.sampleRate,
        channels: cover.channels,
        frames: cover.frames,
        samples: decoded,
      };
      metrics = audioMetrics(cover, decodedCarrier).metrics;

      try {
        extractAudioPayload(decodedCarrier, passphrase);
        status = "PASS";
      } catch (err) {
        if (err instanceof ApiError) {
          status = "FAIL";
        } else {
          status = "ERROR";
          errorCode = "EXTRACTION_ERROR";
        }
      }
    } catch {
      status = "ERROR";
      errorCode = "CODEC_ERROR";
    }

    const result: FlacRoundTrip = {
      runId: createRunId(),
      media: "audio",
      test: "flac",
      parameter: level,
      inputBytes: bytes.length,
      outputBytes,
      metrics,
      pcmIdentical,
      extractionStatus: status,
      elapsedMs: Math.round(performance.now() - started),
      errorCode,
      sha256Before,
      sha256After,
    };

    return jsonOk(result);
  });
}
