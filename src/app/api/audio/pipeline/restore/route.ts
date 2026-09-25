import { ApiError } from "@/lib/contracts/errors";
import { assertFileSize, jsonOk, runHandler, toBase64 } from "@/lib/api/http";
import { audioMetrics, samplesIdentical } from "@/lib/analysis/audio";
import { decodeFlacBytes } from "@/lib/media/flac";
import { decodeWav, encodeWav } from "@/lib/media/wav";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const compressed = form.get("file");
    const source = form.get("source");
    if (!(compressed instanceof File) || !(source instanceof File)) throw ApiError.badRequest("Compressed FLAC and original WAV are required.");
    assertFileSize(compressed);
    assertFileSize(source);
    const original = decodeWav(new Uint8Array(await source.arrayBuffer()));
    const samples = await decodeFlacBytes(new Uint8Array(await compressed.arrayBuffer()));
    if (samples.length !== original.samples.length) throw ApiError.mediaMismatch("Decoded FLAC sample count differs from the original WAV.");
    const restoredCarrier = { ...original, samples };
    const restored = encodeWav(restoredCarrier);
    return jsonOk({
      artifact: { name: compressed.name.split(".").slice(0, -1).join(".") + "-restored.wav", mime: "audio/wav", size: restored.length, base64: toBase64(restored) },
      metrics: audioMetrics(original, restoredCarrier).metrics,
      pcmIdentical: samplesIdentical(original.samples, samples),
    });
  });
}
