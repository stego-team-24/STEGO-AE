import type { Metadata } from "next";
import { Infiltration } from "@/features/game/Infiltration";

export const metadata: Metadata = { title: "Phantom Infiltration" };

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Infiltration mapId={id} />;
}
