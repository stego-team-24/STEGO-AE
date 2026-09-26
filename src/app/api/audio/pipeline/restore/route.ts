import { ApiError } from "@/lib/contracts/errors";
import { assertFileSize, jsonOk, runHandler, toBase64 } from "@/lib/api/http";
import { audioMetrics, samplesIdentical } from "@/lib/analysis/audio";
import { decodeFlacBytes } from "@/lib/media/flac";
import { decodeMp3ToCarrier } from "@/lib/media/mp3";
import { decodeWav, encodeWav } from "@/lib/media/wav";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const compressed = form.get("file");
    const source = form.get("source");
    if (!(compressed instanceof File) || !(source instanceof File)) throw ApiError.badRequest("Compressed FLAC/MP3 and original WAV are required.");
    assertFileSize(compressed);
    assertFileSize(source);
    const original = decodeWav(new Uint8Array(await source.arrayBuffer()));
    const compressedBytes = new Uint8Array(await compressed.arrayBuffer());
    const isMp3 = compressed.type === "audio/mpeg" || compressed.name.toLowerCase().endsWith(".mp3");
    const restoredCarrier = isMp3
      ? await decodeMp3ToCarrier(compressedBytes, original)
      : { ...original, samples: await decodeFlacBytes(compressedBytes) };
    if (restoredCarrier.samples.length !== original.samples.length) throw ApiError.mediaMismatch("Decoded audio sample count differs from the original WAV.");
    const restored = encodeWav(restoredCarrier);
    const format = isMp3 ? "mp3" : "flac";
    const sourceStem = source.name.replace(/\.[^.]+$/, "").replace(/-ori$/, "");
    return jsonOk({
      artifact: { name: `${sourceStem}-after-${format}.wav`, mime: "audio/wav", size: restored.length, base64: toBase64(restored) },
      metrics: audioMetrics(original, restoredCarrier).metrics,
      pcmIdentical: samplesIdentical(original.samples, restoredCarrier.samples),
    });
  });
}
