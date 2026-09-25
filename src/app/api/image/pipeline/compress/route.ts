import { imageCompressionFormatSchema, parseOrThrow, readField } from "@/lib/contracts/schemas";
import { jsonOk, readUpload, runHandler, toBase64 } from "@/lib/api/http";
import { encodeCompressedImage } from "@/lib/media/jpeg";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const { file, bytes } = await readUpload(form);
    const format = parseOrThrow(imageCompressionFormatSchema, readField(form, "format"), "format");
    const output = await encodeCompressedImage(bytes, format);
    const extension = format === "jpeg" ? "jpg" : "webp";
    const mime = format === "jpeg" ? "image/jpeg" : "image/webp";
    return jsonOk({
      artifact: { name: file.name.split(".").slice(0, -1).join(".") + `.${extension}`, mime, size: output.length, base64: toBase64(output) },
      parameter: 80,
      format,
    });
  });
}
