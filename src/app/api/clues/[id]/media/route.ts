import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clue = await prisma.clueNode.findUnique({ where: { id } });
  if (!clue) {
    return new Response("Not found", { status: 404 });
  }
  const source = new URL(request.url).searchParams.get("source");
  const bytes = new Uint8Array(source === "cover" ? clue.coverData : clue.mediaData);
  return new Response(bytes, {
    headers: {
      "Content-Type": source === "cover"
        ? clue.mediaType === "IMAGE" ? "image/png" : "audio/wav"
        : clue.mediaMime,
      "Cache-Control": "no-store",
    },
  });
}
