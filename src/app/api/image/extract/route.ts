import { passphraseSchema, parseOrThrow, readField } from "@/lib/contracts/schemas";
import { decodePng } from "@/lib/media/png";
import { extractImagePayload } from "@/lib/engine/extract";
import { jsonOk, readUpload, runHandler } from "@/lib/api/http";

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

    const carrier = await decodePng(bytes);
    return jsonOk(extractImagePayload(carrier, passphrase));
  });
}
