import type { Metrics, TestResult } from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";
import {
  imageCompressionFormatSchema,
  parseOrThrow,
  passphraseSchema,
  readField,
} from "@/lib/contracts/schemas";
import { decodePng } from "@/lib/media/png";
import { decodeCompressedImageToRgb, encodeCompressedImage } from "@/lib/media/jpeg";
import { imageMetrics } from "@/lib/analysis/image";
import { extractImagePayload } from "@/lib/engine/extract";
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
    const format = parseOrThrow(imageCompressionFormatSchema, readField(form, "format"), "format");

    const stego = await decodePng(bytes);

    // Baseline must pass first so a post-compression failure is meaningful.
    extractImagePayload(stego, passphrase);

    const started = performance.now();
    let outputBytes: number | null = null;
    let metrics: Metrics | null = null;
    let status: TestResult["extractionStatus"] = "NOT_RUN";
    let errorCode: string | null = null;

    try {
      const compressedBytes = await encodeCompressedImage(bytes, format);
      outputBytes = compressedBytes.length;
      const decoded = await decodeCompressedImageToRgb(compressedBytes);
      metrics = imageMetrics(stego, decoded);

      try {
        extractImagePayload(decoded, passphrase);
        status = "PASS";
      } catch (err) {
        // A failed extraction after lossy compression is a legitimate result
        // (the header or payload was damaged), not a codec error.
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
      media: "image",
      test: format,
      parameter: 80,
      inputBytes: bytes.length,
      outputBytes,
      metrics,
      pcmIdentical: null,
      extractionStatus: status,
      elapsedMs: Math.round(performance.now() - started),
      errorCode,
    };

    return jsonOk(result);
  });
}
