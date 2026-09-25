import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/contracts/errors";
import { jsonOk, runHandler } from "@/lib/api/http";
import { decodePng } from "@/lib/media/png";
import { decodeWav } from "@/lib/media/wav";
import { extractImagePayload } from "@/lib/engine/extract";
import { extractAudioPayload } from "@/lib/engine/extract";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runHandler(async () => {
    const { id } = await params;
    const clue = await prisma.clueNode.findUnique({ where: { id } });
    if (!clue) {
      throw ApiError.badRequest("Clue not found.");
    }

    const body = (await request.json()) as { passphrase?: unknown };
    const passphrase = body.passphrase;
    if (typeof passphrase !== "string" || passphrase.length === 0) {
      throw ApiError.badRequest("Passphrase is required.", "passphrase");
    }

    const mediaData = new Uint8Array(clue.mediaData);
    if (clue.mediaType === "IMAGE") {
      const carrier = await decodePng(mediaData);
      return jsonOk(extractImagePayload(carrier, passphrase));
    }
    const carrier = decodeWav(mediaData);
    return jsonOk(extractAudioPayload(carrier, passphrase));
  });
}
