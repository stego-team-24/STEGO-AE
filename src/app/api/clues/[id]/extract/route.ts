import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/contracts/errors";
import { jsonOk, runHandler } from "@/lib/api/http";
import { decodePng } from "@/lib/media/png";
import { decodeWav } from "@/lib/media/wav";
import { extractImagePayload } from "@/lib/engine/extract";
import { extractAudioPayload } from "@/lib/engine/extract";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runHandler(async () => {
    const user = await requireUser();
    const { id } = await params;
    const clue = await prisma.clueNode.findUnique({ where: { id } });
    if (!clue) {
      throw ApiError.badRequest("Clue not found.");
    }

    const body = (await request.json()) as { passphrase?: unknown };
    const passphrase = body.passphrase;
    if (typeof passphrase !== "string") {
      throw ApiError.badRequest("Passphrase must be text.", "passphrase");
    }

    const mediaData = new Uint8Array(clue.mediaData);
    const result = clue.mediaType === "IMAGE"
      ? extractImagePayload(await decodePng(mediaData), passphrase)
      : extractAudioPayload(decodeWav(mediaData), passphrase);
    await prisma.clueSolve.upsert({
      where: { userId_clueId: { userId: user.id, clueId: clue.id } },
      create: { userId: user.id, clueId: clue.id, extractedText: result.text },
      update: { extractedText: result.text },
    });
    return jsonOk(result);
  });
}
