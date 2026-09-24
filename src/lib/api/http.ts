/**
 * Shared helpers for route handlers. Reference: PRD section 8.
 * Every endpoint answers JSON with `Cache-Control: no-store` and no stack
 * traces; errors use `{ error: { code, message, field?, requestId } }`.
 */

import crypto from "node:crypto";
import { LIMITS } from "@/lib/contracts/types";
import { ApiError, createRequestId, toErrorBody, toErrorStatus } from "@/lib/contracts/errors";
import { readFile } from "@/lib/contracts/schemas";

export const NO_STORE = { "Cache-Control": "no-store" };

export function jsonOk(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export function handleError(err: unknown): Response {
  const requestId = createRequestId();
  return Response.json(toErrorBody(err, requestId), {
    status: toErrorStatus(err),
    headers: NO_STORE,
  });
}

/** Wrap a handler so unexpected errors become clean 500 responses. */
export async function runHandler(
  fn: () => Promise<Response> | Response,
): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    return handleError(err);
  }
}

export function assertFileSize(file: File): void {
  if (file.size > LIMITS.maxUploadBytes) {
    throw ApiError.tooLarge(
      `File must be at most ${LIMITS.maxUploadBytes} bytes (1 MiB).`,
      "file",
    );
  }
}

export async function fileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Read and size-check the `file` field of a multipart request. */
export async function readUpload(form: FormData): Promise<{ file: File; bytes: Uint8Array }> {
  const file = readFile(form, "file");
  assertFileSize(file);
  return { file, bytes: await fileBytes(file) };
}

export function createRunId(): string {
  return crypto.randomUUID();
}

export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}
