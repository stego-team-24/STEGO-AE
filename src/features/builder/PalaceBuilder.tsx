"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/forms/Button";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { publishMap, type ClueInput } from "@/lib/api/client";
import { inspectAudio, inspectImage } from "@/lib/api/client";
import { navigateWithTransition } from "@/lib/navigation";
import type { PngInfo, WavInfo } from "@/lib/contracts/types";
import { AudioPreview, ImagePreview } from "@/components/media/MediaPreview";
import {
  BLANK_TEMPLATE_ID,
  GRID_SIZES,
  MAX_GRID_SIZE,
  MIN_GRID_SIZE,
  TEMPLATES,
  columnLabel,
  createBlankTemplate,
  getTemplate,
  isReachableLayout,
  isValidGridSize,
  wallSetFromCoordinates,
  type GridPoint,
} from "@/lib/templates";

type Mode = "floor" | "wall" | "entrance" | "treasure" | "clue" | "shadow" | "erase";
interface ClueDraft extends GridPoint {
  mediaType: "IMAGE" | "AUDIO";
  message: string;
  passphrase: string;
  cover: File | null;
}

const TOOLS: { key: Mode; icon: string; label: string; help: string }[] = [
  { key: "floor", icon: "□", label: "Floor", help: "Select and edit clue nodes" },
  { key: "wall", icon: "▪", label: "Wall", help: "Click tiles to add or remove walls" },
  { key: "entrance", icon: "▶", label: "Entrance", help: "Place the player start" },
  { key: "treasure", icon: "◇", label: "Treasure", help: "Place the treasure" },
  { key: "shadow", icon: "◉", label: "Shadow", help: "Place a stationary guard" },
  { key: "clue", icon: "?", label: "Clue", help: "Place an encrypted clue" },
  { key: "erase", icon: "×", label: "Erase", help: "Remove a marker or wall" },
];

function fromTemplate(id: string, size: number) {
  return id === BLANK_TEMPLATE_ID ? createBlankTemplate(size) : getTemplate(id, size);
}

export function PalaceBuilder() {
  const firstTemplate = getTemplate(TEMPLATES[0].id, 15);
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [gridSize, setGridSize] = useState(15);
  const [customGridSize, setCustomGridSize] = useState("15");
  const [templateId, setTemplateId] = useState<string>(firstTemplate.id);
  const [mode, setMode] = useState<Mode>("floor");
  const [walls, setWalls] = useState<[number, number][]>(firstTemplate.walls);
  const [entrance, setEntrance] = useState<GridPoint | null>(firstTemplate.entrance);
  const [treasure, setTreasure] = useState<GridPoint | null>(firstTemplate.treasure);
  const [shadows, setShadows] = useState<GridPoint[]>(firstTemplate.shadows);
  const [clues, setClues] = useState<ClueDraft[]>(
    firstTemplate.clues.map((clue) => ({ ...clue, cover: null })),
  );
  const [selectedClue, setSelectedClue] = useState<number | null>(0);
  const [entryBriefing, setEntryBriefing] = useState(firstTemplate.entryBriefing);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wallSet = useMemo(() => wallSetFromCoordinates(walls), [walls]);
  const clue = selectedClue === null ? null : clues[selectedClue] ?? null;

  useEffect(() => {
    fetch("/api/auth/session").then((response) => response.json()).then((data: { user?: { displayName?: string } }) => {
      if (data.user?.displayName) setAuthorName((current) => current || data.user!.displayName!);
    }).catch(() => undefined);
  }, []);

  function applyTemplate(id: string, size = gridSize) {
    const template = fromTemplate(id, size);
    setTemplateId(id);
    setGridSize(size);
    setCustomGridSize(String(size));
    setWalls(template.walls);
    setEntrance(id === BLANK_TEMPLATE_ID ? null : template.entrance);
    setTreasure(id === BLANK_TEMPLATE_ID ? null : template.treasure);
    setShadows(template.shadows);
    setClues(template.clues.map((item) => ({ ...item, cover: null })));
    setSelectedClue(template.clues.length ? 0 : null);
    setEntryBriefing(template.entryBriefing);
    setMode("floor");
    setError(null);
  }

  function changeGridSize(size: number) {
    if (!isValidGridSize(size)) return;
    applyTemplate(templateId, size);
  }

  function occupied(x: number, y: number) {
    return (entrance?.x === x && entrance.y === y) ||
      (treasure?.x === x && treasure.y === y) ||
      shadows.some((point) => point.x === x && point.y === y) ||
      clues.some((item) => item.x === x && item.y === y);
  }

  function setEntranceBriefing(passphrase: string) {
    setEntryBriefing((previous) => {
      const marker = "Password for Clue 1: ";
      const start = previous.indexOf(marker);
      return start < 0 ? `${previous.trim()} Password for Clue 1: ${passphrase}` : `${previous.slice(0, start + marker.length)}${passphrase}`;
    });
  }

  function handleTileClick(x: number, y: number) {
    setError(null);
    const tileKey = `${x},${y}`;
    const onWall = wallSet.has(tileKey);
    if (mode === "wall") {
      if (occupied(x, y)) {
        setError("Move the entrance, treasure, shadow, or clue before placing a wall here.");
      } else {
        setWalls((previous) => onWall ? previous.filter(([wx, wy]) => wx !== x || wy !== y) : [...previous, [x, y]]);
      }
      return;
    }
    if (mode === "erase") {
      setWalls((previous) => previous.filter(([wx, wy]) => wx !== x || wy !== y));
      setEntrance((previous) => previous?.x === x && previous.y === y ? null : previous);
      setTreasure((previous) => previous?.x === x && previous.y === y ? null : previous);
      setShadows((previous) => previous.filter((point) => point.x !== x || point.y !== y));
      setClues((previous) => previous.filter((item) => item.x !== x || item.y !== y));
      setSelectedClue(null);
      return;
    }
    if (mode === "floor") {
      if (onWall) return;
      const index = clues.findIndex((item) => item.x === x && item.y === y);
      setSelectedClue(index >= 0 ? index : null);
      return;
    }

    const collision = occupied(x, y) && !(mode === "entrance" && entrance?.x === x && entrance.y === y) &&
      !(mode === "treasure" && treasure?.x === x && treasure.y === y);
    if (collision) {
      setError("Each game object needs its own tile.");
      return;
    }
    setWalls((previous) => previous.filter(([wx, wy]) => wx !== x || wy !== y));
    const point = { x, y };
    if (mode === "entrance") {
      setEntrance(point);
      setShadows((previous) => previous.filter((item) => item.x !== x || item.y !== y));
      setClues((previous) => previous.filter((item) => item.x !== x || item.y !== y));
    } else if (mode === "treasure") {
      setTreasure(point);
      setShadows((previous) => previous.filter((item) => item.x !== x || item.y !== y));
      setClues((previous) => previous.filter((item) => item.x !== x || item.y !== y));
    } else if (mode === "shadow") {
      setShadows((previous) => [...previous, point]);
    } else if (mode === "clue") {
      const index = clues.length;
      const passphrase = `PHANTOM-CLUE-${String(index + 1).padStart(2, "0")}`;
      const newClue: ClueDraft = {
        ...point,
        mediaType: "IMAGE",
        message: `Search for clue ${index + 2} after recovering this message.`,
        passphrase,
        cover: null,
      };
      setClues((previous) => [...previous, newClue]);
      setSelectedClue(index);
      if (index === 0) setEntranceBriefing(passphrase);
    }
  }

  function updateClue(index: number, patch: Partial<ClueDraft>) {
    setClues((previous) => previous.map((item, i) => i === index ? { ...item, ...patch } : item));
    if (index === 0 && patch.passphrase) setEntranceBriefing(patch.passphrase);
  }

  function removeClue(index: number) {
    setClues((previous) => previous.filter((_, i) => i !== index));
    setSelectedClue(null);
  }

  async function publish() {
    if (!title.trim()) return setError("Give the palace a title.");
    if (!entrance) return setError("Place an Entrance first.");
    if (!treasure) return setError("Place a Treasure first.");
    if (clues.length === 0) return setError("Add at least one clue node.");
    if (!entryBriefing.trim()) return setError("Add the password briefing for Clue 1.");
    for (const item of clues) {
      if (!item.message.trim()) return setError("Every clue needs a hidden message.");
      if (item.passphrase.length > 128)
        return setError("Clue keys must be at most 128 characters.");
      if (!item.cover) return setError(`Choose a cover file for Clue ${clues.indexOf(item) + 1}.`);
    }
    const obstacles = wallSetFromCoordinates(walls);
    if (!isReachableLayout(gridSize, obstacles, entrance, [treasure, ...shadows, ...clues])) {
      return setError("All clues, shadows, and the treasure must be reachable from the entrance.");
    }

    setPublishing(true);
    setError(null);
    try {
      const clueInputs: ClueInput[] = clues.map((item, index) => ({
        nodeOrder: index,
        coordX: item.x,
        coordY: item.y,
        mediaType: item.mediaType,
        message: item.message,
        passphrase: item.passphrase,
        cover: item.cover as File,
      }));
      await publishMap({
        title: title.trim(),
        authorName: authorName.trim() || "Anonymous",
        templateId,
        gridSize,
        walls,
        entryBriefing: entryBriefing.trim(),
        entranceX: entrance.x,
        entranceY: entrance.y,
        treasureX: treasure.x,
        treasureY: treasure.y,
        shadows,
        clues: clueInputs,
      });
      navigateWithTransition("/maps");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? <ErrorBanner message={error} /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-card border border-line bg-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold uppercase tracking-[1px] text-accent">
                {gridSize}×{gridSize} Labyrinth Canvas
              </h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-muted">
                Coordinates A–{columnLabel(gridSize - 1)} / Click a tile to edit
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[1px] text-accent">
                Active tool: {TOOLS.find((tool) => tool.key === mode)?.label}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label="Map editing tools">
              {TOOLS.map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  title={tool.help}
                  aria-label={tool.label}
                  aria-pressed={mode === tool.key}
                  onClick={() => setMode(tool.key)}
                  className={`grid size-9 place-items-center rounded-control border font-mono text-sm transition-colors ${mode === tool.key ? "border-accent bg-accent/10 text-accent" : "border-line bg-raised text-muted hover:text-ink"}`}
                >
                  {tool.icon}
                </button>
              ))}
            </div>
          </div>
          <MazeGrid
            gridSize={gridSize}
            walls={wallSet}
            entrance={entrance}
            treasure={treasure}
            shadows={shadows}
            clues={clues}
            mode={mode}
            onTile={handleTileClick}
          />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[.7px] text-muted" aria-label="Map legend">
            <span><b className="text-success">▶</b> Entrance</span>
            <span><b className="text-accent">◇</b> Treasure</span>
            <span><b className="text-error">●</b> Shadow</span>
            <span><b className="text-sky-400">?</b> Clue</span>
            <span><b className="text-muted">▪</b> Wall</span>
          </div>
        </section>

        <aside className="space-y-3">
          <section className="rounded-card border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[12px] font-semibold uppercase tracking-[1px] text-accent">Maze Base Template</h2>
              <button type="button" onClick={() => applyTemplate(BLANK_TEMPLATE_ID)} className="font-mono text-[10px] uppercase text-muted hover:text-accent">
                + Blank
              </button>
            </div>
            <div className="mb-4 grid grid-cols-5 gap-1.5">
              {GRID_SIZES.map((size) => (
                <button key={size} type="button" onClick={() => changeGridSize(size)} className={`rounded-control border px-1 py-2 font-mono text-[10px] ${gridSize === size ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-ink"}`}>
                  {size}×{size}
                </button>
              ))}
            </div>
            <label className="mb-3 block text-[10px] uppercase tracking-[1px] text-muted">
              Custom grid size ({MIN_GRID_SIZE}–{MAX_GRID_SIZE})
              <input
                type="number"
                min={MIN_GRID_SIZE}
                max={MAX_GRID_SIZE}
                value={customGridSize}
                onChange={(event) => setCustomGridSize(event.target.value)}
                onBlur={() => changeGridSize(Number(customGridSize))}
                onKeyDown={(event) => { if (event.key === "Enter") changeGridSize(Number(customGridSize)); }}
                className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 font-mono text-[12px] text-ink"
              />
            </label>
            <div className="space-y-1">
              {TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyTemplate(item.id)}
                  className="flex w-full items-center gap-2 py-1 text-left font-mono text-[11px] text-muted hover:text-ink"
                >
                  <span className={`size-3 rounded-full border ${templateId === item.id ? "border-accent bg-accent" : "border-line"}`} />
                  {item.name}
                </button>
              ))}
            </div>
            <p className="mt-3 border-t border-line pt-3 font-mono text-[9px] uppercase tracking-[.7px] text-muted">
              {clues.length} clues · {shadows.length} guards · {walls.length} walls
            </p>
          </section>

          <section className="rounded-card border border-line bg-surface p-4">
            <h2 className="text-[12px] font-semibold uppercase tracking-[1px] text-accent">Palace Details</h2>
            <div className="mt-3 grid gap-2">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Palace title" className="w-full rounded-control border border-line bg-canvas px-3 py-2 text-[13px] text-ink placeholder:text-muted" />
              <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} placeholder="Author name" className="w-full rounded-control border border-line bg-canvas px-3 py-2 text-[13px] text-ink placeholder:text-muted" />
              <label className="text-[10px] uppercase tracking-[1px] text-muted">
                Entrance briefing · reveals Clue 1 password
                <textarea value={entryBriefing} onChange={(event) => setEntryBriefing(event.target.value)} rows={3} className="mt-1 w-full resize-y rounded-control border border-line bg-canvas px-3 py-2 text-[12px] normal-case tracking-normal text-ink" />
              </label>
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-[1px] text-accent">Clue Node Editor</h2>
              <span className="font-mono text-[10px] text-muted">{clues.length} NODES</span>
            </div>
            {clues.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {clues.map((item, index) => (
                  <button key={`${item.x},${item.y}`} type="button" onClick={() => { setSelectedClue(index); setMode("floor"); }} className={`rounded-control border px-2.5 py-1.5 font-mono text-[10px] ${selectedClue === index ? "border-sky-400/60 bg-sky-400/10 text-sky-300" : "border-line text-muted"}`}>
                    CLUE {index + 1}
                  </button>
                ))}
              </div>
            )}
            {clue && selectedClue !== null ? (
              <ClueEditor clue={clue} index={selectedClue} update={updateClue} remove={removeClue} />
            ) : (
              <p className="rounded-control border border-dashed border-line p-3 text-[12px] text-muted">
                Select a clue tile or choose the Clue tool and place a node on the canvas.
              </p>
            )}
          </section>
          <Button disabled={publishing} onClick={publish} className="w-full justify-center py-4">
            {publishing ? "Hiding payloads…" : "Save Palace Map"}
          </Button>
        </aside>
      </div>
    </div>
  );
}

function ClueEditor({ clue, index, update, remove }: {
  clue: ClueDraft;
  index: number;
  update: (index: number, patch: Partial<ClueDraft>) => void;
  remove: (index: number) => void;
}) {
  const id = `clue-${index}`;
  const [inspection, setInspection] = useState<{ file: File; capacity: PngInfo | WavInfo | null; error?: string } | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!clue.cover) return;
    const file = clue.cover;
    let active = true;
    const reader = new FileReader();
    reader.onload = () => { if (active && typeof reader.result === "string") setPreview({ file, url: reader.result }); };
    reader.readAsDataURL(file);
    const inspect = clue.mediaType === "IMAGE" ? inspectImage(file) : inspectAudio(file);
    inspect.then((capacity) => { if (active) setInspection({ file, capacity }); })
      .catch((error: unknown) => { if (active) setInspection({ file, capacity: null, error: error instanceof Error ? error.message : "Could not inspect this file." }); });
    return () => { active = false; };
  }, [clue.cover, clue.mediaType]);
  const capacity = inspection?.file === clue.cover ? inspection.capacity : null;
  const previewUrl = preview?.file === clue.cover ? preview.url : "";
  const inspectionError = inspection?.file === clue.cover ? inspection.error : null;
  const inspecting = Boolean(clue.cover && inspection?.file !== clue.cover);
  const messageBytes = new TextEncoder().encode(clue.message).length;
  const capacityPercent = capacity ? Math.min(100, Math.ceil(messageBytes / Math.max(1, capacity.capacityBytes) * 100)) : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase text-muted">
        <span>Clue {index + 1} · {columnLabel(clue.x)}{clue.y + 1}</span>
        <button type="button" onClick={() => remove(index)} className="text-error hover:underline">Remove</button>
      </div>
      <label htmlFor={`${id}-message`} className="block text-[10px] uppercase tracking-[1px] text-muted">
        Encrypted payload
        <textarea id={`${id}-message`} value={clue.message} onChange={(event) => update(index, { message: event.target.value })} rows={3} className="mt-1 w-full resize-y rounded-control border border-line bg-canvas px-3 py-2 text-[12px] normal-case tracking-normal text-ink" />
      </label>
      <label htmlFor={`${id}-pass`} className="block text-[10px] uppercase tracking-[1px] text-muted">
        Stego key · optional · 128 chars max
        <input id={`${id}-pass`} type="text" maxLength={128} value={clue.passphrase} onChange={(event) => update(index, { passphrase: event.target.value })} className="mt-1 w-full rounded-control border border-line bg-canvas px-3 py-2 font-mono text-[12px] normal-case tracking-normal text-ink" />
      </label>
      <select value={clue.mediaType} onChange={(event) => update(index, { mediaType: event.target.value as "IMAGE" | "AUDIO", cover: null })} className="w-full rounded-control border border-line bg-canvas px-3 py-2 text-[12px] text-ink">
        <option value="IMAGE">Cover image · PNG</option>
        <option value="AUDIO">Cover audio · WAV</option>
      </select>
      <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-control border border-dashed px-4 py-3 text-center font-mono text-[10px] ${clue.mediaType === "IMAGE" ? "border-sky-500/50 bg-sky-500/5 text-sky-300" : "border-purple-500/50 bg-purple-500/5 text-purple-300"}`}>
        <span className="text-lg">{clue.mediaType === "IMAGE" ? "▧" : "♫"}</span>
        {clue.cover ? clue.cover.name : `Drop ${clue.mediaType === "IMAGE" ? "PNG" : "WAV"} / click to browse`}
        <input type="file" accept={clue.mediaType === "IMAGE" ? "image/png" : "audio/wav"} className="sr-only" onChange={(event) => { update(index, { cover: event.target.files?.[0] ?? null }); event.target.value = ""; }} />
      </label>
      {previewUrl ? <div className="p5-panel p5-cut-sm overflow-hidden p-3">
        <p className="mb-2 font-mono text-[9px] uppercase tracking-[.08em] text-muted">Source media · preserved</p>
        {clue.mediaType === "IMAGE" ? <ImagePreview src={previewUrl} alt={`Clue ${index + 1} source cover`} className="max-h-48 w-full border border-line bg-canvas object-contain" /> : <AudioPreview src={previewUrl} />}
        <p className="mt-2 truncate font-mono text-[9px] text-muted">{clue.cover?.name} · {((clue.cover?.size ?? 0) / 1024).toFixed(1)} KB</p>
      </div> : null}
      {inspecting ? <p className="font-mono text-[9px] text-muted">Inspecting carrier capacity…</p> : null}
      {inspectionError ? <p role="alert" className="text-[10px] text-error">{inspectionError}</p> : null}
      {capacity ? <div className="p5-panel p5-cut-sm space-y-2 p-3">
        <div className="flex items-center justify-between gap-3"><span className="font-mono text-[9px] uppercase tracking-[.06em] text-muted">Live LSB capacity</span><strong className={`font-mono text-[10px] ${capacityPercent > 100 ? "text-error" : "text-accent"}`}>{capacityPercent}% USED</strong></div>
        <div className="capacity-track"><i className={capacityPercent > 100 ? "is-over" : ""} style={{ width: `${capacityPercent}%` }} /></div>
        <p className="font-mono text-[9px] text-muted">{messageBytes} message bytes · {capacity.capacityBytes} maximum · {"width" in capacity ? `${capacity.width}×${capacity.height} PNG` : `${capacity.sampleRate} Hz · ${capacity.channels} channels WAV`}</p>
      </div> : null}
      <p className="font-mono text-[9px] uppercase text-muted">Stego payload embeds on publish after file selection.</p>
    </div>
  );
}

function MazeGrid({ gridSize, walls, entrance, treasure, shadows, clues, mode, onTile }: {
  gridSize: number;
  walls: Set<string>;
  entrance: GridPoint | null;
  treasure: GridPoint | null;
  shadows: GridPoint[];
  clues: ClueDraft[];
  mode: Mode;
  onTile: (x: number, y: number) => void;
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `28px repeat(${gridSize}, minmax(17px, 1fr))`, minWidth: `${28 + gridSize * 20}px` }}>
        <div />
        {Array.from({ length: gridSize }, (_, x) => <div key={`head-${x}`} className="text-center font-mono text-[9px] text-muted">{columnLabel(x)}</div>)}
        {Array.from({ length: gridSize }, (_, y) => (
          <MazeRow key={y} y={y} gridSize={gridSize} walls={walls} entrance={entrance} treasure={treasure} shadows={shadows} clues={clues} mode={mode} onTile={onTile} />
        ))}
      </div>
    </div>
  );
}

function MazeRow({ y, gridSize, walls, entrance, treasure, shadows, clues, mode, onTile }: {
  y: number; gridSize: number; walls: Set<string>; entrance: GridPoint | null; treasure: GridPoint | null;
  shadows: GridPoint[]; clues: ClueDraft[]; mode: Mode; onTile: (x: number, y: number) => void;
}) {
  return (
    <>
      <div className="grid place-items-center font-mono text-[9px] text-muted">{y + 1}</div>
      {Array.from({ length: gridSize }, (_, x) => {
        const wall = walls.has(`${x},${y}`);
        const isEntrance = entrance?.x === x && entrance.y === y;
        const isTreasure = treasure?.x === x && treasure.y === y;
        const clueIndex = clues.findIndex((item) => item.x === x && item.y === y);
        const isShadow = shadows.some((item) => item.x === x && item.y === y);
        let label = "";
        let style = "border-line/50 bg-[#171729]";
        if (wall) style = "border-line/20 bg-[#080810]";
        else if (isEntrance) { label = "▶"; style = "border-success/60 bg-success/15 text-success"; }
        else if (isTreasure) { label = "◇"; style = "border-accent/70 bg-accent/20 text-accent"; }
        else if (clueIndex >= 0) { label = String(clueIndex + 1); style = "border-sky-400/60 bg-sky-400/15 text-sky-300"; }
        else if (isShadow) { label = "●"; style = "border-error/60 bg-error/15 text-error"; }
        return (
          <button key={x} type="button" aria-label={`${wall ? "Wall" : "Floor"} ${columnLabel(x)}${y + 1}${label ? `, ${label}` : ""}`} aria-pressed={mode === "wall" && wall} onClick={() => onTile(x, y)} className={`grid aspect-square h-auto w-full min-w-0 place-items-center border font-mono text-[10px] transition-colors hover:border-accent/70 hover:brightness-125 ${style}`}>
            {label}
          </button>
        );
      })}
    </>
  );
}
