export const MIN_GRID_SIZE = 10;
export const MAX_GRID_SIZE = 30;
export const GRID_SIZES = [10, 15, 20, 25, 30] as const;

export interface GridPoint {
  x: number;
  y: number;
}

export interface TemplateClue extends GridPoint {
  message: string;
  passphrase: string;
  mediaType: "IMAGE" | "AUDIO";
}

export interface LabyrinthTemplate {
  id: string;
  name: string;
  walls: [number, number][];
  entrance: GridPoint;
  treasure: GridPoint;
  shadows: GridPoint[];
  clues: TemplateClue[];
  entryBriefing: string;
  gridSize: number;
}

export const TEMPLATES = [
  { id: "spiral-descent", name: "Spiral Descent" },
  { id: "cross-corridors", name: "Cross Corridors" },
  { id: "zigzag-maze", name: "Zigzag Maze" },
  { id: "dungeon-classic", name: "Dungeon Classic" },
  { id: "radial-web", name: "Radial Web" },
  { id: "serpentine-path", name: "Serpentine Path" },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];
export const BLANK_TEMPLATE_ID = "custom";

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function key(point: GridPoint) {
  return `${point.x},${point.y}`;
}

function inBounds(x: number, y: number, size: number) {
  return x >= 0 && y >= 0 && x < size && y < size;
}

function openMaze(id: string, size: number) {
  const floor = new Set<string>();
  const random = seeded(hash(`${id}:${size}`));
  const first: GridPoint = { x: 1, y: 1 };
  const stack = [first];
  floor.add(key(first));
  const patternIndex = TEMPLATES.findIndex((template) => template.id === id);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [
      { x: current.x + 2, y: current.y, order: 0 },
      { x: current.x, y: current.y + 2, order: 1 },
      { x: current.x - 2, y: current.y, order: 2 },
      { x: current.x, y: current.y - 2, order: 3 },
    ].filter((next) =>
      next.x > 0 && next.y > 0 && next.x < size - 1 && next.y < size - 1 &&
      !floor.has(key(next)),
    );

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    neighbors.sort((a, b) => {
      const horizontalBias = patternIndex === 2 || patternIndex === 5 ? -1 : 0;
      const verticalBias = patternIndex === 1 || patternIndex === 4 ? 1 : 0;
      const biasA = a.order < 2 ? horizontalBias : verticalBias;
      const biasB = b.order < 2 ? horizontalBias : verticalBias;
      return biasA - biasB || random() - 0.5;
    });
    const next = neighbors[0];
    floor.add(key({ x: current.x + (next.x - current.x) / 2, y: current.y + (next.y - current.y) / 2 }));
    floor.add(key(next));
    stack.push({ x: next.x, y: next.y });
  }

  // Open a few deterministic loops so the generated layouts feel like palace corridors.
  const loopChance = patternIndex === 1 || patternIndex === 4 ? 0.25 : 0.13;
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (floor.has(`${x},${y}`) || random() > loopChance) continue;
      const horizontal = floor.has(`${x - 1},${y}`) && floor.has(`${x + 1},${y}`);
      const vertical = floor.has(`${x},${y - 1}`) && floor.has(`${x},${y + 1}`);
      if (horizontal || vertical) floor.add(`${x},${y}`);
    }
  }
  return floor;
}

function reachablePath(floor: Set<string>, start: GridPoint, finish: GridPoint): GridPoint[] {
  const queue = [start];
  const previous = new Map<string, string | null>([[key(start), null]]);
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const point = queue[cursor];
    if (key(point) === key(finish)) break;
    for (const [dx, dy] of dirs) {
      const next = { x: point.x + dx, y: point.y + dy };
      const nextKey = key(next);
      if (floor.has(nextKey) && !previous.has(nextKey)) {
        previous.set(nextKey, key(point));
        queue.push(next);
      }
    }
  }
  const path: GridPoint[] = [];
  let cursor: string | null = key(finish);
  while (cursor !== null) {
    const [x, y] = cursor.split(",").map(Number);
    path.push({ x, y });
    cursor = previous.get(cursor) ?? null;
  }
  return path.reverse();
}

function clueCount(size: number) {
  if (size <= 10) return 3;
  if (size <= 15) return 4;
  if (size <= 20) return 6;
  if (size <= 25) return 8;
  return 10;
}

export function getTemplate(id: string, size = 15): LabyrinthTemplate {
  const selected = TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0];
  const floor = openMaze(selected.id, size);
  const entrance = { x: 1, y: 1 };
  const cells = [...floor].map((cell) => {
    const [x, y] = cell.split(",").map(Number);
    return { x, y };
  });
  let treasure = entrance;
  let furthest = -1;
  for (const point of cells) {
    const distance = Math.abs(point.x - entrance.x) + Math.abs(point.y - entrance.y);
    if (distance > furthest) {
      furthest = distance;
      treasure = point;
    }
  }
  const path = reachablePath(floor, entrance, treasure);
  const count = clueCount(size);
  const passphrases = Array.from({ length: count }, (_, index) =>
    `${selected.id.split("-").map((part) => part.slice(0, 2)).join("").toUpperCase()}-${size}-KEY-${String(index + 1).padStart(2, "0")}`,
  );
  const clues: TemplateClue[] = Array.from({ length: count }, (_, index) => {
    const point = path[Math.min(path.length - 2, Math.floor(((index + 1) * (path.length - 1)) / (count + 1)))];
    const next = path[Math.min(path.length - 1, Math.floor(((index + 2) * (path.length - 1)) / (count + 1)))];
    const nextPassword = passphrases[index + 1];
    const message = nextPassword
      ? `Navigate to column ${columnLabel(next.x)} row ${next.y + 1}. The next clue password is: ${nextPassword}.`
      : `The treasure is hidden at column ${columnLabel(treasure.x)} row ${treasure.y + 1}. Return to the entrance after finding it.`;
    return { ...point, message, passphrase: passphrases[index], mediaType: "IMAGE" as const };
  });

  const shadowCandidates = cells.filter((point) =>
    key(point) !== key(entrance) && key(point) !== key(treasure) &&
    !clues.some((clue) => key(clue) === key(point)),
  );
  const shadowCount = Math.min(size <= 10 ? 2 : size <= 15 ? 3 : 5, shadowCandidates.length);
  const shadows: GridPoint[] = [];
  const random = seeded(hash(`${selected.id}:shadows:${size}`));
  while (shadows.length < shadowCount && shadowCandidates.length > 0) {
    const index = Math.floor(random() * shadowCandidates.length);
    shadows.push(shadowCandidates.splice(index, 1)[0]);
  }

  const walls: [number, number][] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!floor.has(`${x},${y}`)) walls.push([x, y]);
    }
  }
  return {
    ...selected,
    gridSize: size,
    walls,
    entrance,
    treasure,
    shadows,
    clues,
    entryBriefing: `WELCOME, PHANTOM THIEF. Your first clue is at ${columnLabel(clues[0].x)}${clues[0].y + 1}. Password for Clue 1: ${clues[0].passphrase}`,
  };
}

/** Wall layouts used by maps saved before custom grid walls were persisted. */
export function getLegacyTemplateWalls(id: string): [number, number][] {
  const line = (x0: number, y0: number, x1: number, y1: number): [number, number][] => {
    const cells: [number, number][] = [[x0, y0]];
    let x = x0;
    let y = y0;
    while (x !== x1 || y !== y1) {
      if (x !== x1) x += Math.sign(x1 - x);
      if (y !== y1) y += Math.sign(y1 - y);
      cells.push([x, y]);
    }
    return cells;
  };
  if (id === "t-crossing") return [...line(7, 0, 7, 6), ...line(7, 9, 7, 14), ...line(0, 7, 6, 7), ...line(9, 7, 14, 7)];
  if (id === "t-pillars") {
    const walls: [number, number][] = [];
    for (let y = 2; y <= 12; y += 3) for (let x = 2; x <= 12; x += 3) walls.push([x, y]);
    return walls;
  }
  if (id === "t-ring") return [...line(4, 4, 10, 4), ...line(4, 10, 10, 10), ...line(4, 4, 4, 10), ...line(10, 4, 10, 10)];
  if (id === "t-halls") return [...line(0, 4, 6, 4), ...line(9, 4, 14, 4), ...line(0, 10, 6, 10), ...line(9, 10, 14, 10), ...line(3, 0, 3, 2), ...line(11, 12, 11, 14)];
  return [];
}

export function createBlankTemplate(size: number): LabyrinthTemplate {
  return {
    id: BLANK_TEMPLATE_ID,
    name: "Blank Canvas",
    gridSize: size,
    walls: [],
    entrance: { x: -1, y: -1 },
    treasure: { x: -1, y: -1 },
    shadows: [],
    clues: [],
    entryBriefing: "Welcome to the palace. Find the entrance briefing to begin.",
  };
}

export function columnLabel(index: number) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

/** Convert stored coordinates to O(1) wall lookups. */
export function wallSet(template: Pick<LabyrinthTemplate, "walls">): Set<string> {
  return new Set(template.walls.map(([x, y]) => `${x},${y}`));
}

export function wallSetFromCoordinates(walls: [number, number][]) {
  return new Set(walls.map(([x, y]) => `${x},${y}`));
}

export function isValidGridSize(size: number) {
  return Number.isInteger(size) && size >= MIN_GRID_SIZE && size <= MAX_GRID_SIZE;
}

export function isReachableLayout(size: number, walls: Set<string>, start: GridPoint, targets: GridPoint[]) {
  if (!inBounds(start.x, start.y, size) || walls.has(key(start))) return false;
  const visited = new Set([key(start)]);
  const queue = [start];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const point = queue[cursor];
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const x = point.x + dx;
      const y = point.y + dy;
      const nextKey = `${x},${y}`;
      if (inBounds(x, y, size) && !walls.has(nextKey) && !visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push({ x, y });
      }
    }
  }
  return targets.every((target) => visited.has(key(target)));
}
