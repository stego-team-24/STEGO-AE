import { jpegQualitySchema, parseOrThrow, readField } from "@/lib/contracts/schemas";
import { jsonOk, readUpload, runHandler, toBase64 } from "@/lib/api/http";
import { encodeJpeg } from "@/lib/media/jpeg";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runHandler(async () => {
    const form = await request.formData();
    const { file, bytes } = await readUpload(form);
    const quality = parseOrThrow(jpegQualitySchema, readField(form, "quality"), "quality");
    const output = await encodeJpeg(bytes, quality);
    return jsonOk({
      artifact: { name: file.name.split(".").slice(0, -1).join(".") + `-q${quality}.jpg`, mime: "image/jpeg", size: output.length, base64: toBase64(output) },
      parameter: quality,
    });
  });
}
