/**
 * Authenticated encryption with AES-256-GCM. Reference: PRD section 7.
 */

import crypto from "node:crypto";
import { GCM_TAG_BYTES, NONCE_BYTES } from "@/lib/contracts/types";

export interface SealedPayload {
  ciphertext: Uint8Array;
  tag: Uint8Array;
}

/** Encrypt `plaintext`, authenticating `aad` (the 44-byte header). */
export function sealMessage(
  kEnc: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
): SealedPayload {
  const cipher = crypto.createCipheriv("aes-256-gcm", kEnc, nonce, {
    authTagLength: GCM_TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plaintext)),
    cipher.final(),
  ]);
  return {
    ciphertext: new Uint8Array(ciphertext),
    tag: new Uint8Array(cipher.getAuthTag()),
  };
}

/**
 * Verify and decrypt. Returns `null` when authentication fails — the caller
 * must surface the shared message and never partial plaintext.
 */
export function openMessage(
  kEnc: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
  aad: Uint8Array,
): Uint8Array | null {
  const decipher = crypto.createDecipheriv("aes-256-gcm", kEnc, nonce, {
    authTagLength: GCM_TAG_BYTES,
  });
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tag));
  try {
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext)),
      decipher.final(),
    ]);
    return new Uint8Array(plaintext);
  } catch {
    return null;
  }
}

/** Fresh random 12-byte GCM nonce. */
export function newNonce(): Uint8Array {
  return crypto.randomBytes(NONCE_BYTES);
}
