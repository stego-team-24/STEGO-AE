import { passphraseSchema, parseOrThrow, readField } from "@/lib/contracts/schemas";
import { decodeWav } from "@/lib/media/wav";
import { extractAudioPayload } from "@/lib/engine/extract";
import { jsonOk, readUpload, runHandler } from "@/lib/api/http";
import { streamProgressResponse } from "@/lib/api/progress-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const execute = async (onProgress?: (progress: { completed: number; total: number; label: string }) => Promise<void>) => runHandler(async () => {
    const form = await request.formData();
    const { bytes } = await readUpload(form);
    const passphrase = parseOrThrow(
      passphraseSchema,
      readField(form, "passphrase"),
      "passphrase",
    );

    await onProgress?.({ completed: 0, total: 2, label: "Preparing audio decryption…" });
    const carrier = decodeWav(bytes);
    await onProgress?.({ completed: 1, total: 2, label: "Decrypting audio payload…" });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const result = extractAudioPayload(carrier, passphrase);
    await onProgress?.({ completed: 2, total: 2, label: "Audio decryption complete." });
    return jsonOk(result);
  });
  return new URL(request.url).searchParams.get("progress") === "1"
    ? streamProgressResponse((onProgress) => execute(onProgress))
    : execute();
}
