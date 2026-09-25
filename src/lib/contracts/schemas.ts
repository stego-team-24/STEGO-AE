/**
 * Input validation schemas — FROZEN. Reference: PRD sections 4, 6 and 8.
 *
 * The UI validates too, but every endpoint re-validates on the server.
 */

import { z } from "zod";
import { ApiError } from "./errors";
import { LIMITS } from "./types";

const encoder = new TextEncoder();

/** Byte length of a string in UTF-8. Counting characters is not enough (PRD section 6). */
export function utf8Bytes(text: string): number {
  return encoder.encode(text).length;
}

const jpegQualities: readonly number[] = LIMITS.jpegQualities;
const flacLevels: readonly number[] = LIMITS.flacLevels;

export const passphraseSchema = z
  .string()
  .min(
    LIMITS.minPassphraseChars,
    `Passphrase must be at least ${LIMITS.minPassphraseChars} characters.`,
  )
  .max(
    LIMITS.maxPassphraseChars,
    `Passphrase must be at most ${LIMITS.maxPassphraseChars} characters.`,
  );

export const messageSchema = z
  .string()
  .refine(
    (value) => utf8Bytes(value) >= LIMITS.minMessageBytes,
    "Message must not be empty.",
  )
  .refine(
    (value) => utf8Bytes(value) <= LIMITS.maxMessageBytes,
    `Message must be at most ${LIMITS.maxMessageBytes} UTF-8 bytes.`,
  );

export const jpegQualitySchema = z.coerce
  .number()
  .int()
  .refine(
    (value) => jpegQualities.includes(value),
    `JPEG quality must be one of ${jpegQualities.join(", ")}.`,
  );

export const flacLevelSchema = z.coerce
  .number()
  .int()
  .refine(
    (value) => flacLevels.includes(value),
    `FLAC level must be one of ${flacLevels.join(", ")}.`,
  );

export const imageCompressionFormatSchema = z.enum(["jpeg", "webp"]);
export const audioCompressionFormatSchema = z.enum(["flac", "mp3"]);

/** Parse a value or raise an `ApiError` carrying the offending field name. */
export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  value: unknown,
  field: string,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid value.";
    throw ApiError.badRequest(message, field);
  }
  return result.data;
}

/** Read a required text field from multipart form data. */
export function readField(form: FormData, field: string): string {
  const value = form.get(field);
  if (typeof value !== "string") {
    throw ApiError.badRequest(`Missing form field "${field}".`, field);
  }
  return value;
}

/** Read a required file field from multipart form data. */
export function readFile(form: FormData, field: string): File {
  const value = form.get(field);
  if (!(value instanceof File)) {
    throw ApiError.badRequest(`Missing file field "${field}".`, field);
  }
  return value;
}
