import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { P5Panel } from "@/components/p5/P5Panel";
import { PageHeader } from "@/components/layout/PageHeader";
import { MapCatalog, type LobbyMap } from "@/features/lobby/MapCatalog";

export const metadata: Metadata = { title: "Palace Lobby" };
export const dynamic = "force-dynamic";

export default async function MapsPage() {
  const user = await currentUser();
  if (!user) return null;
  const [maps, solvedClues, clearedPalaces, bestRun] = await Promise.all([
    prisma.map.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        clueNodes: { select: { id: true, mediaType: true, _count: { select: { solves: { where: { userId: user.id } } } } } },
        gameResults: { where: { userId: user.id }, orderBy: { score: "desc" }, take: 1, select: { score: true, rank: true } },
      },
    }),
    prisma.clueSolve.count({ where: { userId: user.id } }),
    prisma.gameResult.findMany({ where: { userId: user.id }, distinct: ["mapId"], select: { mapId: true } }),
    prisma.gameResult.findFirst({ where: { userId: user.id }, orderBy: { score: "desc" }, select: { rank: true } }),
  ]);
  const catalogMaps: LobbyMap[] = maps.map((map) => ({
    id: map.id,
    title: map.title,
    authorName: map.authorName,
    gridSize: map.gridSize,
    clueCount: map.clueNodes.length,
    solved: map.clueNodes.filter((clue) => clue._count.solves > 0).length,
    mediaTypes: [...new Set(map.clueNodes.map((clue) => clue.mediaType))],
    bestScore: map.gameResults[0]?.score ?? null,
    bestRank: map.gameResults[0]?.rank ?? null,
  }));

  return <>
    <PageHeader eyebrow="PHANTOM THIEVES · PALACE NETWORK" title="Choose your infiltration." lead={`OPERATIVE: ${user.displayName.toUpperCase()} · SELECT YOUR INFILTRATION TARGET`} actions={<Link href="/builder" className="p5-link-button">＋ CREATE PALACE</Link>} />
    <div className="stats-grid">
      <P5Panel className="stat-tile"><span>PALACES CLEARED</span><strong>{clearedPalaces.length}</strong><small>unique palaces escaped</small></P5Panel>
      <P5Panel className="stat-tile"><span>CLUES RECOVERED</span><strong>{solvedClues}</strong><small>across all palaces</small></P5Panel>
      <P5Panel className="stat-tile"><span>BEST AUDIT RANK</span><strong className="stat-rank">{bestRun?.rank ?? "—"}</strong><small>personal best</small></P5Panel>
    </div>
    <div className="section-heading"><span>01</span><div><h2>PALACE NETWORK</h2><p>Shared community maps · Your progress stays private</p></div></div>
    <MapCatalog maps={catalogMaps} />
    <P5Panel className="lobby-note"><span>NETWORK NOTICE</span><p>Palace layouts and clue media are shared. Your recovered messages, completion times, and personal records are attached to your account.</p></P5Panel>
  </>;
}
