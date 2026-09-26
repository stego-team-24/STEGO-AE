import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/contracts/errors";
import { jsonOk, runHandler } from "@/lib/api/http";
import { decodePng } from "@/lib/media/png";
import { decodeWav } from "@/lib/media/wav";
import { extractImagePayload } from "@/lib/engine/extract";
import { extractAudioPayload } from "@/lib/engine/extract";
import { requireUser } from "@/lib/auth";
import type { ExtractResponse } from "@/lib/contracts/types";

export const runtime = "nodejs";

interface ExtractionProgress { completed: number; total: number; label: string }

async function extractClueResponse(
  request: Request,
  id: string,
  onProgress?: (progress: ExtractionProgress) => Promise<void>,
) {
  return runHandler(async () => {
    const user = await requireUser();
    const clue = await prisma.clueNode.findUnique({ where: { id } });
    if (!clue) {
      throw ApiError.badRequest("Clue not found.");
    }

    const body = (await request.json()) as { passphrase?: unknown };
    const passphrase = body.passphrase;
    if (typeof passphrase !== "string") {
      throw ApiError.badRequest("Passphrase must be text.", "passphrase");
    }

    await onProgress?.({ completed: 0, total: 3, label: "Preparing clue decryption…" });
    const mediaData = new Uint8Array(clue.mediaData);
    let result: ExtractResponse;
    if (clue.mediaType === "IMAGE") {
      const carrier = await decodePng(mediaData);
      await onProgress?.({ completed: 1, total: 3, label: "Decrypting clue payload…" });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      result = extractImagePayload(carrier, passphrase);
    } else {
      const carrier = decodeWav(mediaData);
      await onProgress?.({ completed: 1, total: 3, label: "Decrypting clue payload…" });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      result = extractAudioPayload(carrier, passphrase);
    }
    await onProgress?.({ completed: 2, total: 3, label: "Saving recovered clue…" });
    await prisma.clueSolve.upsert({
      where: { userId_clueId: { userId: user.id, clueId: clue.id } },
      create: { userId: user.id, clueId: clue.id, extractedText: result.text },
      update: { extractedText: result.text },
    });
    await onProgress?.({ completed: 3, total: 3, label: "Decryption complete." });
    return jsonOk(result);
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (new URL(request.url).searchParams.get("progress") !== "1") return extractClueResponse(request, id);

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const send = async (event: unknown) => writer.write(encoder.encode(`${JSON.stringify(event)}\n`));
  void (async () => {
    try {
      const response = await extractClueResponse(request, id, async (progress) => {
        await send({ type: "progress", ...progress });
        if (progress.label === "Decrypting clue payload…") await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
      const body = await response.json();
      await send(response.ok ? { type: "result", body } : { type: "error", body });
    } catch {
      await send({ type: "error", body: { error: { message: "Clue decryption failed." } } });
    } finally {
      await writer.close();
    }
  })();
  return new Response(readable, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
