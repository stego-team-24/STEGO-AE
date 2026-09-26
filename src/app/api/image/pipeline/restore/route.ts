import { ApiError } from "@/lib/contracts/errors";
import { assertFileSize, jsonOk, runHandler, toBase64 } from "@/lib/api/http";
import { decodeCompressedImageToRgb } from "@/lib/media/jpeg";
import { decodePng, encodePng } from "@/lib/media/png";
import { imageMetrics } from "@/lib/analysis/image";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const compressed = form.get("file");
    const source = form.get("source");
    if (!(compressed instanceof File) || !(source instanceof File)) throw ApiError.badRequest("Compressed JPEG/WebP and original PNG are required.");
    assertFileSize(compressed);
    assertFileSize(source);
    const decoded = await decodeCompressedImageToRgb(new Uint8Array(await compressed.arrayBuffer()));
    const restored = await encodePng(decoded);
    const original = await decodePng(new Uint8Array(await source.arrayBuffer()));
    const format = compressed.type === "image/jpeg" || compressed.name.toLowerCase().endsWith(".jpeg") || compressed.name.toLowerCase().endsWith(".jpg") ? "jpeg" : "webp";
    const sourceStem = source.name.replace(/\.[^.]+$/, "").replace(/-ori$/, "");
    return jsonOk({
      artifact: { name: `${sourceStem}-after-${format}.png`, mime: "image/png", size: restored.length, base64: toBase64(restored) },
      metrics: imageMetrics(original, decoded),
    });
  });
}
