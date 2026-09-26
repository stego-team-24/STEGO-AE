import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/contracts/errors";
import { readField } from "@/lib/contracts/schemas";
import { jsonOk, runHandler } from "@/lib/api/http";
import { decodePng, encodePng, PNG_MIME } from "@/lib/media/png";
import { decodeWav, encodeWav, WAV_MIME } from "@/lib/media/wav";
import { embedImagePayload, embedAudioPayload } from "@/lib/engine/embed";
import { imageMetrics } from "@/lib/analysis/image";
import { audioMetrics } from "@/lib/analysis/audio";
import { isReachableLayout, isValidGridSize, wallSetFromCoordinates } from "@/lib/templates";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ClueDescriptor {
  nodeOrder: number;
  coordX: number;
  coordY: number;
  mediaType: "IMAGE" | "AUDIO";
  message: string;
  passphrase: string;
}

interface Shadow {
  x: number;
  y: number;
}

function coord(form: FormData, name: string, gridSize: number): number {
  const value = Number(readField(form, name));
  if (!Number.isInteger(value) || value < 0 || value >= gridSize) {
    throw ApiError.badRequest(`"${name}" must be an integer between 0 and ${gridSize - 1}.`, name);
  }
  return value;
}

function parsePoints(form: FormData, field: string, gridSize: number): Shadow[] {
  const raw = readField(form, field);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw ApiError.badRequest(`${field} must be valid JSON.`, field);
  }
  if (!Array.isArray(parsed)) throw ApiError.badRequest(`${field} must be an array.`, field);
  const points = parsed as Shadow[];
  for (const point of points) {
    if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y) ||
      point.x < 0 || point.x >= gridSize || point.y < 0 || point.y >= gridSize) {
      throw ApiError.badRequest(`${field} contains a coordinate outside the grid.`, field);
    }
  }
  return points;
}

function parseWalls(form: FormData, gridSize: number): [number, number][] {
  const raw = readField(form, "walls");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw ApiError.badRequest("walls must be valid JSON.", "walls");
  }
  if (!Array.isArray(parsed)) throw ApiError.badRequest("walls must be an array.", "walls");
  const walls = parsed as [number, number][];
  const seen = new Set<string>();
  for (const wall of walls) {
    if (!Array.isArray(wall) || wall.length !== 2 || !Number.isInteger(wall[0]) ||
      !Number.isInteger(wall[1]) || wall[0] < 0 || wall[0] >= gridSize || wall[1] < 0 || wall[1] >= gridSize) {
      throw ApiError.badRequest("walls contains a coordinate outside the grid.", "walls");
    }
    const id = `${wall[0]},${wall[1]}`;
    if (seen.has(id)) throw ApiError.badRequest("walls contains a duplicate tile.", "walls");
    seen.add(id);
  }
  return walls;
}

function parseClues(form: FormData, gridSize: number): ClueDescriptor[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readField(form, "clues"));
  } catch {
    throw ApiError.badRequest("clues must be valid JSON.", "clues");
  }
  const clues = parsed as ClueDescriptor[];
  if (!Array.isArray(clues) || clues.length === 0) {
    throw ApiError.badRequest("At least one clue is required.", "clues");
  }
  clues.forEach((clue, index) => {
    if (clue.mediaType !== "IMAGE" && clue.mediaType !== "AUDIO") {
      throw ApiError.badRequest(`Clue ${index}: invalid mediaType.`, "clues");
    }
    if (!Number.isInteger(clue.nodeOrder) || clue.nodeOrder < 0) {
      throw ApiError.badRequest(`Clue ${index}: invalid nodeOrder.`, "clues");
    }
    if (!Number.isInteger(clue.coordX) || clue.coordX < 0 || clue.coordX >= gridSize) {
      throw ApiError.badRequest(`Clue ${index}: coordX out of range.`, "clues");
    }
    if (!Number.isInteger(clue.coordY) || clue.coordY < 0 || clue.coordY >= gridSize) {
      throw ApiError.badRequest(`Clue ${index}: coordY out of range.`, "clues");
    }
    if (typeof clue.message !== "string" || clue.message.length === 0) {
      throw ApiError.badRequest(`Clue ${index}: message is required.`, "clues");
    }
    if (
      typeof clue.passphrase !== "string" ||
      clue.passphrase.length > 128
    ) {
      throw ApiError.badRequest(`Clue ${index}: passphrase must be at most 128 characters.`, "clues");
    }
  });
  return clues;
}

interface ProcessedClue {
  coverData: Uint8Array;
  mediaData: Uint8Array;
  mediaMime: string;
  mse: number;
  psnrDb: number | null;
}

async function processClue(desc: ClueDescriptor, cover: File): Promise<ProcessedClue> {
  const coverData = new Uint8Array(await cover.arrayBuffer());
  if (desc.mediaType === "IMAGE") {
    const coverCarrier = await decodePng(coverData);
    const { carrier } = embedImagePayload(coverCarrier, desc.message, desc.passphrase);
    const mediaData = await encodePng(carrier);
    const metrics = imageMetrics(coverCarrier, carrier);
    return { coverData, mediaData, mediaMime: PNG_MIME, mse: metrics.mse, psnrDb: metrics.psnrDb };
  }
  const coverCarrier = decodeWav(coverData);
  const { carrier } = embedAudioPayload(coverCarrier, desc.message, desc.passphrase);
  const mediaData = encodeWav(carrier);
  const { metrics } = audioMetrics(coverCarrier, carrier);
  return { coverData, mediaData, mediaMime: WAV_MIME, mse: metrics.mse, psnrDb: metrics.psnrDb };
}

export async function POST(request: Request) {
  return runHandler(async () => {
    const user = await requireUser();
    const form = await request.formData();
    const title = readField(form, "title");
    const authorName = readField(form, "authorName");
    const templateId = readField(form, "templateId");
    const gridSize = Number(readField(form, "gridSize"));
    if (!isValidGridSize(gridSize)) {
      throw ApiError.badRequest("gridSize must be an integer from 10 to 30.", "gridSize");
    }
    const entranceX = coord(form, "entranceX", gridSize);
    const entranceY = coord(form, "entranceY", gridSize);
    const treasureX = coord(form, "treasureX", gridSize);
    const treasureY = coord(form, "treasureY", gridSize);
    const shadows = parsePoints(form, "shadows", gridSize);
    const walls = parseWalls(form, gridSize);
    const wallCoordinates = wallSetFromCoordinates(walls);
    const clues = parseClues(form, gridSize);
    const entryBriefing = readField(form, "entryBriefing");

    const occupied = [
      { x: entranceX, y: entranceY },
      { x: treasureX, y: treasureY },
      ...shadows,
      ...clues.map((clue) => ({ x: clue.coordX, y: clue.coordY })),
    ];
    const occupiedKeys = occupied.map(({ x, y }) => `${x},${y}`);
    if (new Set(occupiedKeys).size !== occupiedKeys.length) {
      throw ApiError.badRequest("Entrance, treasure, shadows, and clues must use separate tiles.");
    }
    if (occupiedKeys.some((coordinate) => wallCoordinates.has(coordinate))) {
      throw ApiError.badRequest("A game object cannot be placed on a wall.");
    }
    if (!isReachableLayout(gridSize, wallCoordinates, { x: entranceX, y: entranceY }, [
      { x: treasureX, y: treasureY },
      ...shadows,
      ...clues.map((clue) => ({ x: clue.coordX, y: clue.coordY })),
    ])) {
      throw ApiError.badRequest("Every clue, shadow, and treasure must be reachable from the entrance.");
    }
    if (!entryBriefing.trim()) throw ApiError.badRequest("An entrance briefing is required.", "entryBriefing");

    const processed: ProcessedClue[] = [];
    for (let i = 0; i < clues.length; i += 1) {
      const cover = form.get(`cover_${i}`);
      if (!(cover instanceof File)) {
        throw ApiError.badRequest(`Missing cover file for clue ${i}.`, `cover_${i}`);
      }
      processed.push(await processClue(clues[i], cover));
    }

    const map = await prisma.map.create({
      data: {
        title,
        authorName,
        authorId: user.id,
        gridSize,
        templateId,
        walls: walls as unknown as Prisma.InputJsonValue,
        entryBriefing,
        entranceX,
        entranceY,
        treasureX,
        treasureY,
        shadows: shadows as unknown as Prisma.InputJsonValue,
        clueNodes: {
          create: clues.map((clue, index) => ({
            nodeOrder: clue.nodeOrder,
            coordX: clue.coordX,
            coordY: clue.coordY,
            mediaType: clue.mediaType,
            mediaMime: processed[index].mediaMime,
            coverData: Buffer.from(processed[index].coverData),
            mediaData: Buffer.from(processed[index].mediaData),
            passphrase: clue.passphrase,
            secretOutput: clue.message,
            psnrDb: processed[index].psnrDb,
            mse: processed[index].mse,
          })),
        },
      },
      include: { clueNodes: true },
    });

    return jsonOk({ id: map.id, title: map.title, clueCount: map.clueNodes.length }, 201);
  });
}

export async function GET() {
  return runHandler(async () => {
    const user = await requireUser();
    const maps = await prisma.map.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { clueNodes: true } }, gameResults: { where: { userId: user.id }, orderBy: { score: "desc" }, take: 1 } },
    });
    const [solved, cleared] = await Promise.all([
      prisma.clueSolve.count({ where: { userId: user.id } }),
      prisma.gameResult.count({ where: { userId: user.id } }),
    ]);
    return jsonOk({
      progress: { solvedClues: solved, completedRuns: cleared },
      maps: maps.map((map) => ({
        id: map.id,
        title: map.title,
        authorName: map.authorName,
        gridSize: map.gridSize,
        templateId: map.templateId,
        walls: Array.isArray(map.walls) ? map.walls : [],
        createdAt: map.createdAt,
        clueCount: map._count.clueNodes,
        bestScore: map.gameResults[0]?.score ?? null,
        bestRank: map.gameResults[0]?.rank ?? null,
      })),
    });
  });
}
