"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/forms/Button";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { extractClue, fetchMap, type MapDetail } from "@/lib/api/client";
import { columnLabel, getLegacyTemplateWalls, getTemplate, TEMPLATES, wallSetFromCoordinates } from "@/lib/templates";
import { AudioPreview, ImagePreview } from "@/components/media/MediaPreview";

const VISION_RADIUS = 2;
function visionTiles(x: number, y: number, gridSize: number) {
  const cells: string[] = [];
  for (let dy = -VISION_RADIUS; dy <= VISION_RADIUS; dy += 1) {
    for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx += 1) {
      const tileX = x + dx;
      const tileY = y + dy;
      if (tileX >= 0 && tileY >= 0 && tileX < gridSize && tileY < gridSize) cells.push(`${tileX},${tileY}`);
    }
  }
  return cells;
}

interface Pos {
  x: number;
  y: number;
}

function stepToward(enemy: Pos, target: Pos, walls: Set<string>, gridSize: number, otherShadows: Pos[] = []): Pos {
  const key = (point: Pos) => `${point.x},${point.y}`;
  const startKey = key(enemy);
  const targetKey = key(target);
  const blocked = new Set(otherShadows.map(key));
  const queue = [enemy];
  const previous = new Map<string, string | null>([[startKey, null]]);
  const directions = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];

  for (let cursor = 0; cursor < queue.length && !previous.has(targetKey); cursor += 1) {
    const current = queue[cursor];
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = key(next);
      if (next.x < 0 || next.y < 0 || next.x >= gridSize || next.y >= gridSize || walls.has(nextKey) || blocked.has(nextKey) || previous.has(nextKey)) continue;
      previous.set(nextKey, key(current));
      queue.push(next);
    }
  }

  if (!previous.has(targetKey)) return enemy;
  let stepKey = targetKey;
  let parent = previous.get(stepKey);
  while (parent !== null && parent !== undefined && parent !== startKey) {
    stepKey = parent;
    parent = previous.get(stepKey);
  }
  if (parent !== startKey) return enemy;
  const [x, y] = stepKey.split(",").map(Number);
  return { x, y };
}

export function Infiltration({ mapId }: { mapId: string }) {
  const [map, setMap] = useState<MapDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [player, setPlayer] = useState<Pos>({ x: 0, y: 0 });
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [hp, setHp] = useState(3);
  const [caughtCount, setCaughtCount] = useState(0);
  const [solved, setSolved] = useState<number[]>([]);
  const [solvedMessages, setSolvedMessages] = useState<Record<number, string>>({});
  const [alarm, setAlarm] = useState(false);
  const [victory, setVictory] = useState(false);
  const [failed, setFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [enemies, setEnemies] = useState<Pos[]>([]);
  const [navigatorOn, setNavigatorOn] = useState(false);
  const [navCooldown, setNavCooldown] = useState(false);

  const [modalClue, setModalClue] = useState<number | null>(null);
  const [modalPass, setModalPass] = useState("");
  const [modalText, setModalText] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [totalWrong, setTotalWrong] = useState(0);
  const [entryBriefingOpen, setEntryBriefingOpen] = useState(false);
  const [savedRank, setSavedRank] = useState<string | null>(null);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const completionSent = useRef(false);
  const runId = useRef<string | null>(null);
  const [movementNotice, setMovementNotice] = useState("");
  const [shadowHitAnimating, setShadowHitAnimating] = useState(false);
  const lastShadowHitRef = useRef(0);

  const walls = useMemo(
    () => map
      ? wallSetFromCoordinates(map.walls.length > 0 || map.templateId === "custom"
        ? map.walls
        : TEMPLATES.some((template) => template.id === map.templateId)
          ? getTemplate(map.templateId, map.gridSize).walls
          : getLegacyTemplateWalls(map.templateId))
      : new Set<string>(),
    [map],
  );
  const clues = useMemo(() => map?.clues ?? [], [map]);
  const nextClueIndex = clues.findIndex((_, index) => !solved.includes(index));

  const stateRef = useRef({ player, alarm, victory, failed, enemies, hp });
  useEffect(() => {
    stateRef.current = { player, alarm, victory, failed, enemies, hp };
  });

  useEffect(() => {
    let cancelled = false;
    fetchMap(mapId)
      .then((loaded) => {
        if (cancelled) return;
        setMap(loaded);
        const solvedIndices = loaded.clues.flatMap((clue, index) => loaded.solvedClueIds.includes(clue.id) ? [index] : []);
        setSolved(solvedIndices);
        setSolvedMessages(Object.fromEntries(loaded.clues.flatMap((clue, index) => loaded.solvedMessages[clue.id] ? [[index, loaded.solvedMessages[clue.id]]] : [])));
        setPlayer({ x: loaded.entranceX, y: loaded.entranceY });
        setVisited(new Set(visionTiles(loaded.entranceX, loaded.entranceY, loaded.gridSize)));
        setEnemies(loaded.shadows.map((shadow) => ({ x: shadow.x, y: shadow.y })));
        setEntryBriefingOpen(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load map.");
      });
    return () => {
      cancelled = true;
    };
  }, [mapId]);

  useEffect(() => {
    if (!victory || !map || completionSent.current) return;
    completionSent.current = true;
    runId.current ??= crypto.randomUUID();
    fetch(`/api/maps/${map.id}/complete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: runId.current, elapsedSeconds: elapsed, wrongPassphrases: totalWrong, detections: caughtCount }),
    }).then(async (response) => {
      const data = await response.json() as { score?: number; rank?: string; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "Could not save this run.");
      setSavedRank(data.rank ?? null);
      setSavedScore(data.score ?? null);
    }).catch((error: unknown) => setResultError(error instanceof Error ? error.message : "Could not save this run."));
  }, [victory, map, elapsed, totalWrong, caughtCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = stateRef.current;
      if (!state.victory && !state.failed) setElapsed((prev) => prev + 1);
      if (state.alarm && !state.victory && !state.failed) {
        const moved = state.enemies.map((enemy, index) => stepToward(
          enemy,
          state.player,
          walls,
          map?.gridSize ?? 15,
          state.enemies.filter((_, otherIndex) => otherIndex !== index),
        ));
        const caught = moved.some(
          (enemy) => enemy.x === state.player.x && enemy.y === state.player.y,
        );
        const canDamage = caught && Date.now() - lastShadowHitRef.current >= 1000;
        const nextHp = canDamage ? state.hp - 1 : state.hp;
        setEnemies(moved);
        if (canDamage) {
          lastShadowHitRef.current = Date.now();
          setCaughtCount((count) => count + 1);
          setHp(nextHp);
          setShadowHitAnimating(true);
          const caughtIndex = moved.findIndex((enemy) => enemy.x === state.player.x && enemy.y === state.player.y);
          const oldShadow = state.enemies[caughtIndex];
          const awayX = Math.sign(state.player.x - (oldShadow?.x ?? state.player.x));
          const awayY = Math.sign(state.player.y - (oldShadow?.y ?? state.player.y));
          const knockback = [
            { x: state.player.x + awayX, y: state.player.y },
            { x: state.player.x, y: state.player.y + awayY },
            { x: state.player.x - 1, y: state.player.y }, { x: state.player.x + 1, y: state.player.y },
            { x: state.player.x, y: state.player.y - 1 }, { x: state.player.x, y: state.player.y + 1 },
          ].find((point) => (point.x !== state.player.x || point.y !== state.player.y) && point.x >= 0 && point.y >= 0 && point.x < (map?.gridSize ?? 15) && point.y < (map?.gridSize ?? 15) && !walls.has(`${point.x},${point.y}`));
          if (knockback) {
            setPlayer(knockback);
            setVisited((previous) => new Set([...previous, ...visionTiles(knockback.x, knockback.y, map?.gridSize ?? 15)]));
          }
          window.setTimeout(() => setShadowHitAnimating(false), 320);
        }
        if (nextHp <= 0) setFailed(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [walls, map?.gridSize]);

  const openClueModal = useCallback((index: number) => {
    setModalClue(index);
    setModalPass("");
    setModalText(null);
    setModalError(null);
    setWrongAttempts(0);
    setRevealed(false);
  }, []);

  const reviewSolvedClue = useCallback((index: number) => {
    setModalClue(index);
    setModalPass("");
    setModalText(solvedMessages[index] ?? "");
    setModalError(null);
    setWrongAttempts(0);
    setRevealed(false);
  }, [solvedMessages]);

  const triggerNavigator = useCallback(() => {
    if (navCooldown || victory || failed || modalClue !== null) return;
    setNavigatorOn(true);
    setNavCooldown(true);
    window.setTimeout(() => setNavigatorOn(false), 1000);
    window.setTimeout(() => setNavCooldown(false), 5000);
  }, [navCooldown, victory, failed, modalClue]);

  const moveTo = useCallback(
    (x: number, y: number) => {
      if (victory || failed || modalClue !== null || entryBriefingOpen || shadowHitAnimating || !map) return;
      if (x < 0 || y < 0 || x >= map.gridSize || y >= map.gridSize) {
        setMovementNotice("The palace boundary blocks that direction.");
        return;
      }
      if (walls.has(`${x},${y}`)) {
        setMovementNotice("A wall blocks that direction. Choose an open adjacent tile.");
        return;
      }

      if (Math.abs(x - player.x) + Math.abs(y - player.y) > 1) {
        setMovementNotice("Move one tile at a time through the labyrinth.");
        return;
      }
      setMovementNotice("");
      const shadowCollision = !alarm && enemies.some((enemy) => enemy.x === x && enemy.y === y);
      const previousPlayer = player;
      if (shadowCollision) {
        const now = Date.now();
        const lastDamage = lastShadowHitRef.current;
        if (now - lastDamage >= 1000) {
          lastShadowHitRef.current = now;
          setHp((current) => {
            const next = current - 1;
            if (next <= 0) setFailed(true);
            return next;
          });
          setCaughtCount((count) => count + 1);
        }
        setMovementNotice("Shadow contact! You lost 1 HP.");
        setPlayer({ x, y });
        setVisited((previous) => new Set([...previous, ...visionTiles(x, y, map.gridSize)]));
        setShadowHitAnimating(true);
        window.setTimeout(() => {
          setPlayer(previousPlayer);
          setShadowHitAnimating(false);
        }, 220);
        return;
      }

      setPlayer({ x, y });
      setVisited((prev) => new Set([...prev, ...visionTiles(x, y, map.gridSize)]));

      if (!alarm && x === map.entranceX && y === map.entranceY) {
        setEntryBriefingOpen(true);
        return;
      }

      const clueIndex = clues.findIndex((clue) => clue.coordX === x && clue.coordY === y);
      if (clueIndex >= 0 && clueIndex <= solved.length && !alarm) {
        if (solved.includes(clueIndex)) reviewSolvedClue(clueIndex);
        else openClueModal(clueIndex);
        return;
      }

      if (x === map.treasureX && y === map.treasureY) {
        if (solved.length === clues.length) {
          setVisited(new Set(Array.from({ length: map.gridSize * map.gridSize }, (_, index) => `${index % map.gridSize},${Math.floor(index / map.gridSize)}`)));
          setAlarm(true);
        }
        return;
      }

      if (alarm && x === map.entranceX && y === map.entranceY) {
        setVictory(true);
      }
    },
    [victory, failed, modalClue, entryBriefingOpen, shadowHitAnimating, map, walls, clues, solved, alarm, enemies, player, reviewSolvedClue, openClueModal],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (modalClue !== null || entryBriefingOpen || shadowHitAnimating) return;
      const key = event.key.toLowerCase();
      const target = event.target;
      const typing = target instanceof HTMLElement && (
        target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
      );
      if (!typing && modalClue === null && (event.code === "Space" || key === "enter")) {
        event.preventDefault();
        triggerNavigator();
        return;
      }
      const delta =
        key === "arrowup" || key === "w"
          ? { x: 0, y: -1 }
          : key === "arrowdown" || key === "s"
            ? { x: 0, y: 1 }
            : key === "arrowleft" || key === "a"
              ? { x: -1, y: 0 }
              : key === "arrowright" || key === "d"
                ? { x: 1, y: 0 }
                : null;
      if (delta) {
        event.preventDefault();
        moveTo(player.x + delta.x, player.y + delta.y);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player, moveTo, modalClue, entryBriefingOpen, shadowHitAnimating, triggerNavigator]);

  const submitPassphrase = async () => {
    if (modalClue === null || extracting) return;
    setExtracting(true);
    setModalError(null);
    try {
      const clue = clues[modalClue];
      const result = await extractClue(clue.id, modalPass);
      setModalText(result.text);
      setSolvedMessages((previous) => ({ ...previous, [modalClue]: result.text }));
      setSolved((previous) => previous.includes(modalClue) ? previous : [...previous, modalClue]);
    } catch {
      const nextWrong = wrongAttempts + 1;
      setWrongAttempts(nextWrong);
      setTotalWrong((total) => total + 1);
      if (nextWrong >= 5) {
        setRevealed(true);
        setModalError("You can keep trying. Recheck the briefing and the clue details.");
      } else {
        setModalError("That passphrase did not unlock this clue. Check it and try again.");
      }
    } finally {
      setExtracting(false);
    }
  };

  if (loadError) {
    return <ErrorBanner message={loadError} />;
  }

  if (!map) {
    return <p className="text-muted">Loading palace…</p>;
  }

  const targetTile =
    nextClueIndex >= 0
      ? { x: clues[nextClueIndex].coordX, y: clues[nextClueIndex].coordY }
      : { x: map.treasureX, y: map.treasureY };

  const visibleSet = new Set(visionTiles(player.x, player.y, map.gridSize));

  if (victory) {
    const avgPsnr = clues.reduce((sum, clue) => sum + (clue.psnrDb ?? 0), 0) / Math.max(1, clues.length);
    return (
      <div className="mx-auto max-w-xl rounded-card border border-success/40 bg-success/10 p-8 text-center">
        <h1 className="text-[32px] font-bold text-success">Infiltration complete.</h1>
        <p className="mt-2 text-muted">You escaped the palace with the treasure.</p>
        <div className="mt-6 grid gap-3 min-[900px]:grid-cols-3">
          <Stat label="Time" value={`${elapsed}s`} />
          <Stat label="Wrong passphrases" value={String(totalWrong)} />
          <Stat label="Times caught" value={String(caughtCount)} />
        </div>
        <div className="result-rank"><span>PALACE RANK</span><strong>{savedRank ?? "…"}</strong><small>{savedScore === null ? "Saving your result…" : `${savedScore} / 100 points`}</small></div>
        {resultError ? <p role="alert" className="auth-error">{resultError}</p> : null}
        <p className="mt-5 font-mono text-[13px] text-muted">
          Mean PSNR of the palace media: {avgPsnr.toFixed(2)} dB
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/velvet-room"
            className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 font-medium text-accent-ink hover:brightness-110"
          >
            Open Velvet Room →
          </Link>
          <Link
            href="/maps"
            className="inline-flex min-h-[44px] items-center rounded-control border border-line px-5 hover:bg-raised"
          >
            Back to Lobby
          </Link>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-xl rounded-card border border-error/40 bg-error/10 p-8 text-center">
        <h1 className="text-[32px] font-bold text-error">Mission failed.</h1>
        <p className="mt-2 text-muted">You were caught too many times.</p>
        <Link
          href="/maps"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-control border border-line px-5 hover:bg-raised"
        >
          Back to Lobby
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-0 rounded-card ${alarm ? "bg-[#35151e]" : "bg-canvas"}`}>
      {alarm ? <div className="border-b border-error/30 bg-error/15 px-4 py-3 font-mono text-[11px] uppercase tracking-[1px] text-error">⚠ Treasure chase active — escape to entrance before guards converge!</div> : null}
      {shadowHitAnimating ? <div className="pointer-events-none fixed inset-0 z-[60] animate-pulse bg-red-600/35" aria-hidden="true" /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <div>
          <h1 className="text-heading">{map.title}</h1>
          <p className="text-[13px] text-muted">
            {alarm ? "Alarm active — escape to the entrance!" : "Solve every clue, then reach the treasure."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[14px]">
          <span className="text-muted">
            HP: <span className="text-error">{Array(hp).fill("♥").join("")}</span>
          </span>
          <span className="text-muted">Time: {elapsed}s</span>
          <span className="text-muted">
            Clue:{" "}
            {nextClueIndex >= 0 ? `#${nextClueIndex + 1}` : <span className="text-success">Treasure</span>}
          </span>
          <button
            type="button"
            onClick={triggerNavigator}
            disabled={navCooldown}
            className={`rounded-control border px-4 py-2 text-[13px] ${
              navCooldown ? "border-line text-muted" : "border-accent text-accent hover:bg-accent/10"
            }`}
          >
            {navCooldown ? "Navigator…" : "Navigator · Space / Enter"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="overflow-x-auto rounded-card border border-line bg-[#0b0b18] p-4">
          <div tabIndex={0} aria-label="Labyrinth grid. Use arrow keys or WASD to move one tile." className="grid gap-[2px] outline-none focus-visible:ring-2 focus-visible:ring-accent" style={{ gridTemplateColumns: `24px repeat(${map.gridSize}, minmax(0, 1fr))`, minWidth: `${24 + map.gridSize * 24}px` }}>
            <div />
            {Array.from({ length: map.gridSize }, (_, x) => (
              <div key={x} className="text-center font-mono text-[9px] text-muted">{columnLabel(x)}</div>
            ))}
            {Array.from({ length: map.gridSize }).map((_, y) => (
              <GameRow
                key={y}
                y={y}
                gridSize={map.gridSize}
                walls={walls}
                player={player}
                visited={visited}
                visible={visibleSet}
                map={map}
                clues={clues}
                solved={solved}
                unlockedClueCount={solved.length + 1}
                enemies={enemies}
                alarm={alarm}
                navigatorOn={navigatorOn}
                targetTile={targetTile}
                onMove={moveTo}
              />
            ))}
          </div>
          <p aria-live="polite" className={`mt-3 min-h-4 text-[11px] ${movementNotice ? "text-accent" : "text-muted"}`}>{movementNotice || "Move one tile with arrow keys or WASD. Click adjacent tiles. Space / Enter activates Navigator."}</p>
        </div>

        <aside className="space-y-3">
          <section className="rounded-card border border-line bg-surface p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[1px] text-muted">Movement pad</p>
            <div className="mx-auto grid w-fit grid-cols-3 gap-1">
              <span />
              <MoveButton label="Move north" glyph="↑" onClick={() => moveTo(player.x, player.y - 1)} />
              <span />
              <MoveButton label="Move west" glyph="←" onClick={() => moveTo(player.x - 1, player.y)} />
              <span className="grid place-items-center text-muted">·</span>
              <MoveButton label="Move east" glyph="→" onClick={() => moveTo(player.x + 1, player.y)} />
              <span />
              <MoveButton label="Move south" glyph="↓" onClick={() => moveTo(player.x, player.y + 1)} />
            </div>
          </section>
          <section className="rounded-card border border-line bg-surface p-4">
            <p className="text-[10px] uppercase tracking-[1px] text-muted">Clues</p>
            <ol className="mt-2 space-y-1.5">
              {clues.map((item, index) => {
                const complete = solved.includes(index);
                const unlocked = index <= solved.length;
                return (
                  <li key={item.id} className={`flex items-center justify-between rounded-control border px-2.5 py-2 font-mono text-[10px] ${complete ? "border-success/40 text-success" : unlocked ? "border-accent/40 text-accent" : "border-line text-muted opacity-70"}`}>
                      <span>CLUE {index + 1}</span>
                      <span>{complete ? "✓ SOLVED · REVIEW" : unlocked ? "● ACTIVE" : "○ LOCKED"}</span>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="rounded-card border border-line bg-surface p-4">
            <p className="text-[10px] uppercase tracking-[1px] text-muted">Objective</p>
            <p className="mt-2 font-mono text-[11px] text-ink">{alarm ? "Treasure found. Escape to the entrance." : "Solve clues, find the treasure."}</p>
          </section>
        </aside>
      </div>

      {entryBriefingOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="entry-briefing-title" className="w-full max-w-lg rounded-card border border-accent/40 bg-surface p-6 shadow-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-accent">Entrance briefing</p>
            <h2 id="entry-briefing-title" className="mt-2 text-heading">Your first lead</h2>
            <p className="mt-3 whitespace-pre-wrap rounded-control border border-line bg-canvas p-4 font-mono text-[13px] text-ink">{map.entryBriefing}</p>
            <Button className="mt-4 w-full justify-center" onClick={() => setEntryBriefingOpen(false)}>Begin infiltration</Button>
          </section>
        </div>
      ) : null}

      {modalClue !== null ? (
        <ClueModal
          key={clues[modalClue].id}
          clue={clues[modalClue]}
          index={modalClue}
          passphrase={modalPass}
          setPassphrase={(value) => { setModalPass(value); setModalError(null); }}
          text={modalText}
          error={modalError}
          wrongAttempts={wrongAttempts}
          revealed={revealed}
          extracting={extracting}
          onClose={() => setModalClue(null)}
          onSubmit={submitPassphrase}
          review={solved.includes(modalClue)}
        />
      ) : null}
    </div>
  );
}

function MoveButton({ label, glyph, onClick }: { label: string; glyph: string; onClick: () => void }) {
  return <button type="button" aria-label={label} onClick={onClick} className="grid size-10 place-items-center rounded-control border border-line bg-raised font-mono text-accent hover:border-accent">{glyph}</button>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-line bg-raised px-4 py-3">
      <p className="text-[11px] uppercase tracking-[1px] text-muted">{label}</p>
      <p className="mt-1 font-mono text-[18px] text-ink">{value}</p>
    </div>
  );
}

function GameRow({
  y,
  gridSize,
  walls,
  player,
  visited,
  visible,
  map,
  clues,
  solved,
  unlockedClueCount,
  enemies,
  alarm,
  navigatorOn,
  targetTile,
  onMove,
}: {
  y: number;
  gridSize: number;
  walls: Set<string>;
  player: Pos;
  visited: Set<string>;
  visible: Set<string>;
  map: MapDetail;
  clues: MapDetail["clues"];
  solved: number[];
  unlockedClueCount: number;
  enemies: Pos[];
  alarm: boolean;
  navigatorOn: boolean;
  targetTile: Pos;
  onMove: (x: number, y: number) => void;
}) {
  return (
    <>
      <div className="grid place-items-center font-mono text-[9px] text-muted">{y + 1}</div>
      {Array.from({ length: gridSize }).map((_, x) => {
        const key = `${x},${y}`;
        const isWall = walls.has(key);
        const isPlayer = player.x === x && player.y === y;
        const isVisible = visible.has(key);
        const isVisited = visited.has(key);
        const clueIndex = clues.findIndex((c) => c.coordX === x && c.coordY === y);
        const isEntrance = map.entranceX === x && map.entranceY === y;
        const isTreasure = map.treasureX === x && map.treasureY === y;
        const isEnemy = enemies.some((e) => e.x === x && e.y === y);
        const isNavigated = navigatorOn && targetTile.x === x && targetTile.y === y;

        let content: string | null = null;
        let cell = "bg-[#171729] border-line/50";
        if (isPlayer) { content = "◆"; cell = "border-accent bg-accent text-[#080810]"; }
        else if (!isVisible && !isVisited) cell = "bg-[#050509] border-[#050509]";
        else if (isWall) cell = "bg-[#080810] border-line/30";
        else if (isEnemy && (alarm || isVisible)) { content = "●"; cell = "border-error bg-error/20 text-error"; }
        else if (isTreasure && solved.length === clues.length && (isVisible || alarm)) { content = "◇"; cell = "border-accent bg-accent/40 text-accent"; }
        else if (isEntrance && (isVisible || alarm)) { content = "▶"; cell = "border-success/50 bg-success/10 text-success"; }
        else if (clueIndex >= 0 && clueIndex < unlockedClueCount && (isVisible || alarm)) {
          content = solved.includes(clueIndex) ? "✓" : String(clueIndex + 1);
          cell = solved.includes(clueIndex) ? "border-success/40 bg-success/10 text-success" : "border-sky-400/50 bg-sky-400/15 text-sky-300";
        } else if (isVisible) cell = "bg-[#19192b] border-line";
        else if (isVisited) cell = "bg-[#171729]/50 border-line/30";
        else cell = "bg-[#050509] border-[#050509]";
        return (
          <button key={x} type="button" onClick={() => onMove(x, y)} aria-label={`Tile ${columnLabel(x)}${y + 1}`} className={`grid aspect-square h-auto w-full min-w-0 place-items-center border font-mono text-[10px] ${cell}${isNavigated ? " ring-2 ring-accent" : ""}`}>
            {content}
          </button>
        );
      })}
    </>
  );
}

function ClueModal({
  clue,
  index,
  passphrase,
  setPassphrase,
  text,
  error,
  wrongAttempts,
  revealed,
  extracting,
  onClose,
  onSubmit,
  review,
}: {
  clue: MapDetail["clues"][number];
  index: number;
  passphrase: string;
  setPassphrase: (value: string) => void;
  text: string | null;
  error: string | null;
  wrongAttempts: number;
  revealed: boolean;
  extracting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  review: boolean;
}) {
  const [imageExpanded, setImageExpanded] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  useEffect(() => {
    if (text !== null) document.getElementById("clue-continue")?.focus();
  }, [text]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="clue-title" className="w-full max-w-lg rounded-card border border-line bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="clue-title" className="text-heading">Clue {index + 1}{review ? " · Recovered message" : ""}</h2>
          <button type="button" onClick={onClose} className="text-[13px] text-muted hover:text-ink">Close ✕</button>
        </div>
        <div className="mb-4">
          {clue.mediaType === "IMAGE" ? (
            <button type="button" onClick={() => setImageExpanded(true)} className="block w-full cursor-zoom-in" aria-label="Expand clue image">
              <ImagePreview src={clue.mediaUrl} alt={`Clue ${index + 1} media — select to expand`} />
              <span className="mt-1 block text-right text-[11px] text-muted">Click image to enlarge</span>
            </button>
          ) : <AudioPreview src={clue.mediaUrl} />}
        </div>
        {imageExpanded ? (
          <div role="dialog" aria-modal="true" aria-label={`Clue ${index + 1} image`} className="fixed inset-0 z-[70] grid place-items-center bg-black/90 p-6" onClick={() => setImageExpanded(false)}>
            <button type="button" onClick={() => setImageExpanded(false)} className="absolute right-5 top-5 rounded-control border border-white/30 px-4 py-2 text-sm text-white">Close ✕</button>
            <ImagePreview src={clue.mediaUrl} alt={`Clue ${index + 1} enlarged`} className="max-h-[90vh] max-w-[94vw] rounded-none border-0 bg-transparent object-contain" />
          </div>
        ) : null}
        {text === null ? (
          <>
            <label htmlFor="clue-pass" className="text-[13px] text-muted">Passphrase</label>
            <p className="mt-2 text-[12px] text-muted">Enter this clue’s passphrase, or leave it blank if no key was set.</p>
            <div className="mt-2 flex gap-2">
              <input id={`clue-pass-${clue.id}`} type="text" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (!extracting) onSubmit(); } }} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus className={`min-w-0 flex-1 rounded-control border border-line bg-canvas px-4 py-3 text-ink ${showPassphrase ? "" : "passphrase-masked"}`} />
              <button type="button" onClick={() => setShowPassphrase((value) => !value)} className="rounded-control border border-line px-3 text-[12px] text-muted">{showPassphrase ? "Hide" : "Show"}</button>
            </div>
            {error ? <div className="mt-3"><ErrorBanner message={error} /></div> : null}
            <p className="mt-2 text-[12px] text-muted">Attempts: {wrongAttempts}/5 {revealed ? "— hint revealed, you can keep trying" : ""}</p>
            <div className="mt-4"><Button type="button" disabled={extracting} onClick={onSubmit}>{extracting ? "Extracting…" : "Extract message"}</Button></div>
          </>
        ) : (
          <>
            <label className="text-[13px] text-muted">Recovered message</label>
            <textarea readOnly value={text} rows={4} className="mt-2 w-full rounded-control border border-line bg-canvas px-4 py-3 font-mono text-ink" />
            <div className="mt-4"><Button id="clue-continue" onClick={onClose}>{review ? "Close clue" : "Continue"}</Button></div>
          </>
        )}
      </div>
    </div>
  );
}
