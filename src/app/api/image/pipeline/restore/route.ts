import { ApiError } from "@/lib/contracts/errors";
import { assertFileSize, jsonOk, runHandler, toBase64 } from "@/lib/api/http";
import { decodeJpegToRgb } from "@/lib/media/jpeg";
import { decodePng, encodePng } from "@/lib/media/png";
import { imageMetrics } from "@/lib/analysis/image";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const compressed = form.get("file");
    const source = form.get("source");
    if (!(compressed instanceof File) || !(source instanceof File)) throw ApiError.badRequest("Compressed JPEG and original PNG are required.");
    assertFileSize(compressed);
    assertFileSize(source);
    const decoded = await decodeJpegToRgb(new Uint8Array(await compressed.arrayBuffer()));
    const restored = await encodePng(decoded);
    const original = await decodePng(new Uint8Array(await source.arrayBuffer()));
    return jsonOk({
      artifact: { name: compressed.name.split(".").slice(0, -1).join(".") + "-restored.png", mime: "image/png", size: restored.length, base64: toBase64(restored) },
      metrics: imageMetrics(original, decoded),
    });
  });
}
