/**
 * Key derivation. Reference: PRD section 7.
 *
 * master = PBKDF2-SHA256(passphrase UTF-8, salt, 600000, 32)
 * K_enc  = HKDF-SHA256(master, salt, "stego-ae/v1/encryption", 32)
 * K_pos  = HKDF-SHA256(master, salt, "stego-ae/v1/positions", 32)
 */

import crypto from "node:crypto";
import { KDF_ITERATIONS, KEY_BYTES, SALT_BYTES } from "@/lib/contracts/types";
import type { PayloadHeader } from "@/lib/contracts/types";

export const KDF_INFO_ENCRYPTION = "stego-ae/v1/encryption";
export const KDF_INFO_POSITIONS = "stego-ae/v1/positions";

export interface DerivedKeys {
  /** AES-256-GCM key. */
  kEnc: Buffer;
  /** Key that drives the carrier-position PRNG. */
  kPos: Buffer;
}

function deriveMasterKey(passphrase: string, salt: Uint8Array): Buffer {
  return crypto.pbkdf2Sync(
    Buffer.from(passphrase, "utf8"),
    Buffer.from(salt),
    KDF_ITERATIONS,
    KEY_BYTES,
    "sha256",
  );
}

function hkdf(
  ikm: Buffer,
  salt: Uint8Array,
  info: string,
  length: number,
): Buffer {
  return Buffer.from(
    crypto.hkdfSync("sha256", ikm, Buffer.from(salt), Buffer.from(info, "utf8"), length),
  );
}

/** Derive both keys from a passphrase and a salt. */
export function deriveKeys(passphrase: string, salt: Uint8Array): DerivedKeys {
  const master = deriveMasterKey(passphrase, salt);
  return {
    kEnc: hkdf(master, salt, KDF_INFO_ENCRYPTION, KEY_BYTES),
    kPos: hkdf(master, salt, KDF_INFO_POSITIONS, KEY_BYTES),
  };
}

/** Derive keys using the salt carried in a decoded header. */
export function deriveKeysFromHeader(
  passphrase: string,
  header: PayloadHeader,
): DerivedKeys {
  return deriveKeys(passphrase, header.salt);
}

/** Fresh random 16-byte salt for a new embedding. */
export function newSalt(): Uint8Array {
  return crypto.randomBytes(SALT_BYTES);
}
