import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError } from "@/lib/contracts/errors";
import { jsonOk, runHandler } from "@/lib/api/http";

const schema = z.object({
  runId: z.uuid(),
  elapsedSeconds: z.number().int().min(0).max(86_400),
  wrongPassphrases: z.number().int().min(0).max(1000),
  detections: z.number().int().min(0).max(1000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return runHandler(async () => {
    const user = await requireUser();
    const { id: mapId } = await params;
    let body: unknown;
    try { body = await request.json(); } catch { throw ApiError.badRequest("Invalid result details."); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw ApiError.badRequest("Invalid result details.");
    const map = await prisma.map.findUnique({ where: { id: mapId }, select: { gridSize: true, _count: { select: { clueNodes: true } } } });
    if (!map) throw ApiError.badRequest("Map not found.");
    const solved = await prisma.clueSolve.count({ where: { userId: user.id, clue: { mapId } } });
    if (solved < map._count.clueNodes) throw ApiError.badRequest("Solve every clue before saving a completion.");
    const timePenalty = Math.min(40, Math.floor(parsed.data.elapsedSeconds / (map.gridSize * 2)));
    const score = Math.max(0, 100 - timePenalty - parsed.data.detections * 15 - parsed.data.wrongPassphrases * 5);
    const rank = score >= 90 ? "S" : score >= 75 ? "A" : score >= 55 ? "B" : "C";
    const result = await prisma.gameResult.upsert({
      where: { runId: parsed.data.runId },
      create: { ...parsed.data, mapId, userId: user.id, score, rank },
      update: {},
    });
    if (result.userId !== user.id || result.mapId !== mapId) throw ApiError.badRequest("This result ID has already been used.");
    return jsonOk({ score: result.score, rank: result.rank, completedAt: result.completedAt });
  });
}
