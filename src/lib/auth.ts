import "server-only";
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/contracts/errors";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "steg-ae-session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  return value;
}

export function assertAuthConfiguration() {
  secret();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}.${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(".");
  if (!saltHex || !hashHex || !/^[\da-f]+$/i.test(saltHex + hashHex)) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken(userId: string, expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: expiresAt })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): { userId: string; expiresAt: number } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "base64url"); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown; exp?: unknown };
    if (typeof data.sub !== "string" || typeof data.exp !== "number" || data.exp <= Date.now() / 1000) return null;
    return { userId: data.sub, expiresAt: data.exp };
  } catch { return null; }
}

export async function setSession(userId: string) {
  const expires = new Date((Math.floor(Date.now() / 1000) + SESSION_SECONDS) * 1000);
  (await cookies()).set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires,
  });
}

export async function currentUser() {
  const session = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, displayName: true } });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw ApiError.unauthorized();
  return user;
}

export function authError(message: string, status: number) {
  return Response.json({ error: { message, code: status === 401 ? "UNAUTHENTICATED" : "AUTH_ERROR" } }, { status });
}
