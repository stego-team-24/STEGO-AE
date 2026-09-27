import type { Metrics, TestResult } from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";
import {
  audioCompressionFormatSchema,
  parseOrThrow,
  passphraseSchema,
  readField,
} from "@/lib/contracts/schemas";
import { decodeWav } from "@/lib/media/wav";
import { flacRoundTrip } from "@/lib/media/flac";
import { audioMetrics, samplesIdentical } from "@/lib/analysis/audio";
import { extractAudioPayload } from "@/lib/engine/extract";
import { decodeMp3ToCarrier, encodeMp3 } from "@/lib/media/mp3";
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
    const format = parseOrThrow(audioCompressionFormatSchema, form.get("format") ?? "flac", "format");

    const cover = decodeWav(bytes);

    // Baseline must pass first so the round-trip result is meaningful.
    extractAudioPayload(cover, passphrase);

    const started = performance.now();
    let outputBytes: number | null = null;
    let metrics: Metrics | null = null;
    let pcmIdentical: boolean | null = null;
    let status: TestResult["extractionStatus"] = "NOT_RUN";
    let errorCode: string | null = null;
    try {
      let encoded: Uint8Array;
      let decodedCarrier;
      if (format === "flac") {
        const result = await flacRoundTrip(cover.samples, cover.sampleRate, cover.channels, 16);
        encoded = result.flacBytes;
        decodedCarrier = { ...cover, samples: result.decoded };
      } else {
        encoded = await encodeMp3(cover);
        decodedCarrier = await decodeMp3ToCarrier(encoded, cover);
      }
      outputBytes = encoded.length;
      const decoded = decodedCarrier.samples;
      pcmIdentical = samplesIdentical(cover.samples, decoded);
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

    const result: TestResult = {
      runId: createRunId(),
      media: "audio",
      test: format,
      parameter: null,
      inputBytes: bytes.length,
      outputBytes,
      metrics,
      pcmIdentical,
      extractionStatus: status,
      elapsedMs: Math.round(performance.now() - started),
      errorCode,
    };

    return jsonOk(result);
  });
}
