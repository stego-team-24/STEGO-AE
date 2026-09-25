import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Surface } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Palace Lobby" };
export const dynamic = "force-dynamic";

export default async function MapsPage() {
  const maps = await prisma.map.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clueNodes: true } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="Palace Lobby"
        title="Choose your infiltration."
        lead="Select a palace map built in the Palace Architect, then breach its hidden payloads."
        actions={
          <Link
            href="/builder"
            className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 font-medium text-accent-ink hover:brightness-110"
          >
            Create New Palace →
          </Link>
        }
      />

      {maps.length === 0 ? (
        <Surface className="py-16 text-center">
          <h2 className="text-heading">No palaces yet.</h2>
          <p className="mt-2 text-muted">
            Build a 10–30 tile palace in the Palace Architect.
          </p>
        </Surface>
      ) : (
        <div className="grid gap-4 min-[900px]:grid-cols-3">
          {maps.map((map) => (
            <Surface key={map.id} className="flex flex-col">
              <h2 className="text-heading">{map.title}</h2>
              <p className="mt-1 text-[13px] text-muted">by {map.authorName}</p>
              <div className="mt-4 space-y-1 text-[13px] text-muted">
                <p>{map._count.clueNodes} clue nodes</p>
                <p>{map.gridSize} × {map.gridSize} grid</p>
                <p>Created {map.createdAt.toLocaleDateString("en-GB")}</p>
              </div>
              <Link
                href={`/play/${map.id}`}
                className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-control border border-accent px-5 font-medium text-accent hover:bg-accent/10"
              >
                Infiltrate Palace →
              </Link>
            </Surface>
          ))}
        </div>
      )}
    </>
  );
}
