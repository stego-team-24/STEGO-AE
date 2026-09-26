"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { P5Panel } from "@/components/p5/P5Panel";
import { P5Tag } from "@/components/p5/P5Tag";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { navigateWithTransition } from "@/lib/navigation";

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "ELITE";
export interface LobbyMap {
  id: string;
  title: string;
  authorName: string;
  isAuthor: boolean;
  gridSize: number;
  clueCount: number;
  solved: number;
  mediaTypes: string[];
  bestScore: number | null;
  bestRank: string | null;
}

function difficulty(size: number): Difficulty { return size <= 15 ? "EASY" : size <= 20 ? "MEDIUM" : size <= 25 ? "HARD" : "ELITE"; }

export function MapCatalog({ maps }: { maps: LobbyMap[] }) {
  const router = useRouter();
  const { language } = useLanguage();
  const [filter, setFilter] = useState<Difficulty | "ALL">("ALL");
  const [busyMapId, setBusyMapId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ map: LobbyMap; action: "new-game" | "delete" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = useMemo(() => maps.filter((map) => filter === "ALL" || difficulty(map.gridSize) === filter), [maps, filter]);

  const runPendingAction = async () => {
    if (!pendingAction) return;
    const { map, action } = pendingAction;
    setBusyMapId(map.id);
    setError(null);
    try {
      const response = action === "new-game"
        ? await fetch(`/api/maps/${map.id}/new-game`, { method: "POST" })
        : await fetch(`/api/maps/${map.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? (action === "new-game" ? "Could not start a new game." : "Could not delete this palace."));
      setPendingAction(null);
      if (action === "new-game") navigateWithTransition(`/play/${map.id}`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Palace action failed.");
    } finally {
      setBusyMapId(null);
    }
  };

  return <>
    {error ? <p role="alert" className="mb-4 border border-error/50 bg-error/10 px-4 py-3 text-[12px] text-error">{error}</p> : null}
    <div className="map-filter-row" aria-label="Filter palaces by difficulty">
      {(["ALL", "EASY", "MEDIUM", "HARD", "ELITE"] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} className={`map-filter ${filter === item ? "is-active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}
      <span className="map-count">{shown.length} PALACE{shown.length === 1 ? "" : "S"} IN NETWORK</span>
    </div>
    {shown.length === 0 ? <P5Panel className="empty-panel"><h2>No palaces match this filter.</h2><p>Choose another difficulty to browse the shared network.</p></P5Panel> : <div className="palace-grid">
      {shown.map((map, index) => {
        const percent = map.clueCount ? Math.round(map.solved / map.clueCount * 100) : 0;
        const cleared = map.bestRank !== null;
        return <P5Panel key={map.id} className="palace-card p5-pop-in" style={{ animationDelay: `${220 + index * 65}ms` }}>
          <div className={`palace-status-band ${cleared ? "is-cleared" : ""}`} />
          <div className="palace-card-body">
            <div className="card-topline">
              <div className="card-tags"><P5Tag>{difficulty(map.gridSize)}</P5Tag>{map.mediaTypes.map((media) => <P5Tag key={media} className={media === "AUDIO" ? "tag-audio" : "tag-image"}>{media === "IMAGE" ? "PNG IMAGE" : "WAV AUDIO"}</P5Tag>)}</div>
              <div className="card-map-meta"><span className="card-map-number">PALACE {String(index + 1).padStart(2, "0")}</span>{map.isAuthor ? <button type="button" className="card-delete-action" disabled={busyMapId !== null} onClick={() => setPendingAction({ map, action: "delete" })}>{busyMapId === map.id ? "…" : "DELETE"}</button> : null}</div>
            </div>
            <h2>{map.title}</h2><p className="card-author">DESIGNED BY {map.authorName.toUpperCase()}</p>
            <p className="palace-description">{map.clueCount} encrypted {map.clueCount === 1 ? "clue" : "clues"} across a {map.gridSize} × {map.gridSize} labyrinth. Recover every clue, claim the treasure, and escape.</p>
            <div className="palace-facts"><span>{map.gridSize} × {map.gridSize} GRID</span><span>{map.clueCount} CLUE NODES</span></div>
            <div className="progress-label"><span>CLUES RECOVERED</span><span>{map.solved}/{map.clueCount}</span></div><div className="progress-track"><i style={{ width: `${percent}%` }} /></div>
            <div className="card-foot">
              <span>{cleared ? `✓ CLEARED · BEST ${map.bestRank} · ${map.bestScore} PTS` : "○ NOT YET CLEARED"}</span>
              <div className="card-actions">
                {cleared
                  ? <button type="button" className="card-action p5-palace-entry" disabled={busyMapId !== null} onClick={() => setPendingAction({ map, action: "new-game" })}>{busyMapId === map.id ? "STARTING…" : "NEW GAME →"}</button>
                  : <Link href={`/play/${map.id}`} className="card-action p5-palace-entry">INFILTRATE →</Link>}
              </div>
            </div>
            {pendingAction?.map.id === map.id ? <div className="card-confirmation" role="group" aria-label={pendingAction.action === "delete" ? "Confirm palace deletion" : "Confirm new game"}>
              <p>{pendingAction.action === "delete"
                ? language === "id" ? `Hapus “${map.title}” beserta clue dan semua hasil permainannya?` : `Delete “${map.title}”, its clues, and all game results?`
                : language === "id" ? `Reset progres clue “${map.title}”? Rekor skor tetap disimpan.` : `Reset clue progress for “${map.title}”? Score records will be kept.`}</p>
              <button type="button" className={pendingAction.action === "delete" ? "card-confirm-delete" : "card-confirm-primary"} disabled={busyMapId !== null} onClick={() => void runPendingAction()}>{busyMapId === map.id ? "PROCESSING…" : pendingAction.action === "delete" ? "CONFIRM DELETE" : "START NEW GAME"}</button>
              <button type="button" className="card-confirm-cancel" disabled={busyMapId !== null} onClick={() => setPendingAction(null)}>CANCEL</button>
            </div> : null}
          </div>
        </P5Panel>;
      })}
    </div>}
  </>;
}
