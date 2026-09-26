import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/contracts/errors";
import { jsonOk, runHandler } from "@/lib/api/http";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return runHandler(async () => {
    await requireUser();
    const { id } = await params;
    const map = await prisma.map.findUnique({
      where: { id },
      select: { clueNodes: { orderBy: { nodeOrder: "asc" }, select: { id: true, passphrase: true } } },
    });
    if (!map) throw ApiError.badRequest("Map not found.");
    return jsonOk({ passphrases: Object.fromEntries(map.clueNodes.map(({ id: clueId, passphrase }) => [clueId, passphrase])) });
  });
}
