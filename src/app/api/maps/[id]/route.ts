import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/contracts/errors";
import { jsonOk, runHandler } from "@/lib/api/http";
import { BLANK_TEMPLATE_ID, getLegacyTemplateWalls, getTemplate, TEMPLATES } from "@/lib/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runHandler(async () => {
    const { id } = await params;
    const map = await prisma.map.findUnique({
      where: { id },
      include: { clueNodes: { orderBy: { nodeOrder: "asc" } } },
    });
    if (!map) {
      throw ApiError.badRequest("Map not found.");
    }

    const storedWalls = Array.isArray(map.walls) ? map.walls as [number, number][] : [];
    const legacyTemplate = getTemplate(map.templateId, map.gridSize);
    const walls = storedWalls.length > 0 || map.templateId === BLANK_TEMPLATE_ID
      ? storedWalls
      : TEMPLATES.some((template) => template.id === map.templateId)
        ? legacyTemplate.walls
        : getLegacyTemplateWalls(map.templateId);
    const objectTiles = new Set([
      `${map.entranceX},${map.entranceY}`,
      `${map.treasureX},${map.treasureY}`,
      ...(map.shadows as { x: number; y: number }[]).map(({ x, y }) => `${x},${y}`),
      ...map.clueNodes.map(({ coordX, coordY }) => `${coordX},${coordY}`),
    ]);
    const safeWalls = walls.filter(([x, y]) => !objectTiles.has(`${x},${y}`));

    return jsonOk({
      id: map.id,
      title: map.title,
      authorName: map.authorName,
      gridSize: map.gridSize,
      templateId: map.templateId,
      walls: safeWalls,
      entryBriefing: map.entryBriefing || legacyTemplate.entryBriefing,
      entranceX: map.entranceX,
      entranceY: map.entranceY,
      treasureX: map.treasureX,
      treasureY: map.treasureY,
      shadows: map.shadows,
      createdAt: map.createdAt,
      clues: map.clueNodes.map((clue) => ({
        id: clue.id,
        nodeOrder: clue.nodeOrder,
        coordX: clue.coordX,
        coordY: clue.coordY,
        mediaType: clue.mediaType,
        mediaUrl: `/api/clues/${clue.id}/media`,
        coverMediaUrl: `/api/clues/${clue.id}/media?source=cover`,
        passphrase: clue.passphrase,
        secretOutput: clue.secretOutput,
        psnrDb: clue.psnrDb,
        mse: clue.mse,
      })),
    });
  });
}
