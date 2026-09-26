import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError } from "@/lib/contracts/errors";
import { jsonOk, runHandler } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return runHandler(async () => {
    const user = await requireUser();
    const { id: mapId } = await params;
    const map = await prisma.map.findUnique({ where: { id: mapId }, select: { id: true } });
    if (!map) throw ApiError.badRequest("Map not found.");

    const completion = await prisma.gameResult.findFirst({ where: { mapId, userId: user.id }, select: { id: true } });
    if (!completion) throw ApiError.badRequest("Clear this palace before starting a new game.");

    await prisma.clueSolve.deleteMany({ where: { userId: user.id, clue: { mapId } } });
    return jsonOk({ reset: true, mapId });
  });
}
