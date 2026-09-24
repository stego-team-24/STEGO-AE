/**
 * STEGO-AE v1 public header — FROZEN and byte-exact.
 * Reference: PRD section 7.
 *
 *   0  | 4  magic ASCII "SGAE"
 *   4  | 1  version = 1
 *   5  | 1  media: 1 PNG, 2 WAV
 *   6  | 1  KDF id = 1 PBKDF2-SHA256
 *   7  | 1  flags = 0 (reserved)
 *   8  | 4  iterations = 600000
 *   12 | 4  ciphertext bytes N (UTF-8 plaintext length)
 *   16 | 16 salt
 *   32 | 12 nonce
 *   ------------------------- 44 bytes total
 *
 * Multi-byte integers are big-endian. The header is embedded in order in the
 * first 352 carrier positions and authenticated as GCM AAD.
 */

import {
  HEADER_BYTES,
  HEADER_CARRIER_BITS,
  KDF_ID_PBKDF2_SHA256,
  KDF_ITERATIONS,
  MAGIC,
  MEDIA_CODE,
  NONCE_BYTES,
  PROTOCOL_VERSION,
  SALT_BYTES,
  type HeaderDecodeResult,
  type MediaCode,
  type PayloadHeader,
} from "@/lib/contracts/types";

const OFFSET_MAGIC = 0;
const OFFSET_VERSION = 4;
const OFFSET_MEDIA = 5;
const OFFSET_KDF = 6;
const OFFSET_FLAGS = 7;
const OFFSET_ITERATIONS = 8;
const OFFSET_LENGTH = 12;
const OFFSET_SALT = 16;
const OFFSET_NONCE = 32;

export { HEADER_BYTES, HEADER_CARRIER_BITS };

function isMediaCode(value: number): value is MediaCode {
  return value === MEDIA_CODE.image || value === MEDIA_CODE.audio;
}

/** Serialize a header into exactly 44 bytes. */
export function encodeHeader(header: PayloadHeader): Uint8Array {
  if (!isMediaCode(header.mediaCode)) {
    throw new Error("Unsupported media code in header.");
  }
  if (header.salt.length !== SALT_BYTES) {
    throw new Error(`Salt must be ${SALT_BYTES} bytes.`);
  }
  if (header.nonce.length !== NONCE_BYTES) {
    throw new Error(`Nonce must be ${NONCE_BYTES} bytes.`);
  }
  if (!Number.isInteger(header.ciphertextBytes) || header.ciphertextBytes < 0) {
    throw new Error("Ciphertext length must be a non-negative integer.");
  }

  const bytes = new Uint8Array(HEADER_BYTES);
  const view = new DataView(bytes.buffer);

  for (let i = 0; i < MAGIC.length; i += 1) {
    bytes[OFFSET_MAGIC + i] = MAGIC.charCodeAt(i);
  }
  view.setUint8(OFFSET_VERSION, header.version);
  view.setUint8(OFFSET_MEDIA, header.mediaCode);
  view.setUint8(OFFSET_KDF, header.kdfId);
  view.setUint8(OFFSET_FLAGS, header.flags);
  view.setUint32(OFFSET_ITERATIONS, header.iterations, false);
  view.setUint32(OFFSET_LENGTH, header.ciphertextBytes, false);
  bytes.set(header.salt, OFFSET_SALT);
  bytes.set(header.nonce, OFFSET_NONCE);

  return bytes;
}

/**
 * Validate and parse the first 44 bytes of a carrier.
 *
 * Length, flags, version and KDF are checked before any allocation so a
 * corrupt or hostile header cannot trigger iteration abuse (PRD section 11).
 */
export function decodeHeader(bytes: Uint8Array): HeaderDecodeResult {
  if (bytes.length < HEADER_BYTES) {
    return { ok: false, reason: "TOO_SHORT" };
  }

  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[OFFSET_MAGIC + i] !== MAGIC.charCodeAt(i)) {
      return { ok: false, reason: "BAD_MAGIC" };
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const version = view.getUint8(OFFSET_VERSION);
  if (version !== PROTOCOL_VERSION) {
    return { ok: false, reason: "BAD_VERSION" };
  }

  const mediaCode = view.getUint8(OFFSET_MEDIA);
  if (!isMediaCode(mediaCode)) {
    return { ok: false, reason: "BAD_MEDIA" };
  }

  const kdfId = view.getUint8(OFFSET_KDF);
  if (kdfId !== KDF_ID_PBKDF2_SHA256) {
    return { ok: false, reason: "BAD_KDF" };
  }

  const flags = view.getUint8(OFFSET_FLAGS);
  if (flags !== 0) {
    return { ok: false, reason: "BAD_FLAGS" };
  }

  const iterations = view.getUint32(OFFSET_ITERATIONS, false);
  if (iterations !== KDF_ITERATIONS) {
    return { ok: false, reason: "BAD_ITERATIONS" };
  }

  const ciphertextBytes = view.getUint32(OFFSET_LENGTH, false);

  return {
    ok: true,
    header: {
      version,
      mediaCode,
      kdfId,
      flags,
      iterations,
      ciphertextBytes,
      salt: bytes.slice(OFFSET_SALT, OFFSET_SALT + SALT_BYTES),
      nonce: bytes.slice(OFFSET_NONCE, OFFSET_NONCE + NONCE_BYTES),
    },
  };
}

/** Bytes the payload occupies in the carrier: header + ciphertext + GCM tag. */
export function payloadBytesInCarrier(ciphertextBytes: number): number {
  return HEADER_BYTES + ciphertextBytes + 16;
}
