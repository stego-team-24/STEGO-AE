import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertAuthConfiguration, authError, hashPassword, setSession } from "@/lib/auth";

const schema = z.object({ displayName: z.string().trim().min(2).max(60), email: z.email().trim().toLowerCase(), password: z.string().min(6).max(128) });

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return authError("Enter valid account details.", 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return authError("Use a valid email, a name from 2–60 characters, and a password from 6–128 characters.", 400);
  try {
    assertAuthConfiguration();
    const { password, ...accountData } = parsed.data;
    const user = await prisma.user.create({ data: { ...accountData, passwordHash: await hashPassword(password) }, select: { id: true, email: true, displayName: true } });
    await setSession(user.id);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return authError("An account with this email already exists.", 409);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorCode = error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
    console.error("[auth/register] Registration failed:", { errorName, errorCode });
    return authError("Account registration is temporarily unavailable. Check the server configuration and try again.", 503);
  }
}
