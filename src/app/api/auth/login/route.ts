import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertAuthConfiguration, authError, setSession, verifyPassword } from "@/lib/auth";

const schema = z.object({ email: z.email().trim().toLowerCase(), password: z.string().min(1).max(128) });

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return authError("Enter your email and password.", 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return authError("Enter a valid email and password.", 400);
  try {
    assertAuthConfiguration();
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return authError("Email or password is incorrect.", 401);
    await setSession(user.id);
    return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch {
    return authError("Sign in is temporarily unavailable. Check the server configuration and try again.", 503);
  }
}
