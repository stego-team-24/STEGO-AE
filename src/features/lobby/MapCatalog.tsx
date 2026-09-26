"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { P5Panel } from "@/components/p5/P5Panel";
import { P5Tag } from "@/components/p5/P5Tag";

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "ELITE";
export interface LobbyMap {
  id: string;
  title: string;
  authorName: string;
  gridSize: number;
  clueCount: number;
  solved: number;
  mediaTypes: string[];
  bestScore: number | null;
  bestRank: string | null;
}

function difficulty(size: number): Difficulty { return size <= 15 ? "EASY" : size <= 20 ? "MEDIUM" : size <= 25 ? "HARD" : "ELITE"; }

export function MapCatalog({ maps }: { maps: LobbyMap[] }) {
  const [filter, setFilter] = useState<Difficulty | "ALL">("ALL");
  const shown = useMemo(() => maps.filter((map) => filter === "ALL" || difficulty(map.gridSize) === filter), [maps, filter]);
  return <>
    <div className="map-filter-row" aria-label="Filter palaces by difficulty">
      {(["ALL", "EASY", "MEDIUM", "HARD", "ELITE"] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} className={`map-filter ${filter === item ? "is-active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}
      <span className="map-count">{shown.length} PALACE{shown.length === 1 ? "" : "S"} IN NETWORK</span>
    </div>
    {shown.length === 0 ? <P5Panel className="empty-panel"><h2>No palaces match this filter.</h2><p>Choose another difficulty to browse the shared network.</p></P5Panel> : <div className="palace-grid">
      {shown.map((map, index) => {
        const percent = map.clueCount ? Math.round(map.solved / map.clueCount * 100) : 0;
        const cleared = map.bestRank !== null;
        return <P5Panel key={map.id} className="palace-card p5-pop-in" style={{ animationDelay: `${index * 55}ms` }}>
          <div className={`palace-status-band ${cleared ? "is-cleared" : ""}`} />
          <div className="palace-card-body">
            <div className="card-topline"><div className="card-tags"><P5Tag>{difficulty(map.gridSize)}</P5Tag>{map.mediaTypes.map((media) => <P5Tag key={media} className={media === "AUDIO" ? "tag-audio" : "tag-image"}>{media === "IMAGE" ? "PNG IMAGE" : "WAV AUDIO"}</P5Tag>)}</div><span className="card-map-number">PALACE {String(index + 1).padStart(2, "0")}</span></div>
            <h2>{map.title}</h2><p className="card-author">DESIGNED BY {map.authorName.toUpperCase()}</p>
            <p className="palace-description">{map.clueCount} encrypted {map.clueCount === 1 ? "clue" : "clues"} across a {map.gridSize} × {map.gridSize} labyrinth. Recover every clue, claim the treasure, and escape.</p>
            <div className="palace-facts"><span>{map.gridSize} × {map.gridSize} GRID</span><span>{map.clueCount} CLUE NODES</span></div>
            <div className="progress-label"><span>CLUES RECOVERED</span><span>{map.solved}/{map.clueCount}</span></div><div className="progress-track"><i style={{ width: `${percent}%` }} /></div>
            <div className="card-foot"><span>{cleared ? `✓ CLEARED · BEST ${map.bestRank} · ${map.bestScore} PTS` : "○ NOT YET CLEARED"}</span><Link href={`/play/${map.id}`} className="card-action">{cleared ? "REPLAY →" : "INFILTRATE →"}</Link></div>
          </div>
        </P5Panel>;
      })}
    </div>}
  </>;
}
