/**
 * Shared embed/extract core over a CarrierView. Reference: PRD section 7.
 * This module is internal to the engine; the media-specific entry points live
 * in embed.ts and extract.ts.
 */

import {
  GCM_TAG_BYTES,
  HEADER_BYTES,
  KDF_ID_PBKDF2_SHA256,
  KDF_ITERATIONS,
  MEDIA_CODE,
  PROTOCOL_VERSION,
  type Media,
  type PayloadHeader,
} from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";
import { utf8Bytes } from "@/lib/contracts/schemas";
import { encodeHeader, decodeHeader } from "@/lib/stego/header";
import { assertCapacity } from "@/lib/stego/capacity";
import {
  bytesToBits,
  bitsToBytes,
  embedBits,
  embedHeaderBits,
  readBits,
  readHeaderBits,
  type CarrierView,
} from "@/lib/stego/bits";
import { buildPayloadPositions } from "@/lib/stego/positions";
import { deriveKeys, deriveKeysFromHeader, newSalt } from "@/lib/crypto/kdf";
import { sealMessage, openMessage, newNonce } from "@/lib/crypto/aead";

export interface EmbedOutcome {
  header: PayloadHeader;
  messageBytes: number;
}

export function embedIntoCarrier(
  view: CarrierView,
  carrierCount: number,
  media: Media,
  message: string,
  passphrase: string,
): EmbedOutcome {
  const messageBytes = utf8Bytes(message);
  assertCapacity(carrierCount, messageBytes);

  const salt = newSalt();
  const nonce = newNonce();
  const header: PayloadHeader = {
    version: PROTOCOL_VERSION,
    mediaCode: MEDIA_CODE[media],
    kdfId: KDF_ID_PBKDF2_SHA256,
    flags: 0,
    iterations: KDF_ITERATIONS,
    ciphertextBytes: messageBytes,
    salt,
    nonce,
  };
  const headerBytes = encodeHeader(header);

  const { kEnc, kPos } = deriveKeys(passphrase, salt);
  const sealed = sealMessage(
    kEnc,
    nonce,
    new TextEncoder().encode(message),
    headerBytes,
  );

  const payload = new Uint8Array(sealed.ciphertext.length + sealed.tag.length);
  payload.set(sealed.ciphertext, 0);
  payload.set(sealed.tag, sealed.ciphertext.length);

  const positions = buildPayloadPositions(kPos, carrierCount);
  embedHeaderBits(view, headerBytes);
  embedBits(view, positions, bytesToBits(payload));

  return { header, messageBytes };
}

export function extractFromCarrier(
  view: CarrierView,
  carrierCount: number,
  media: Media,
  passphrase: string,
): { text: string; messageBytes: number } {
  const headerBytes = readHeaderBits(view, HEADER_BYTES);
  const decoded = decodeHeader(headerBytes);
  if (!decoded.ok) {
    throw ApiError.invalidHeader();
  }

  const header = decoded.header;
  if (header.mediaCode !== MEDIA_CODE[media]) {
    throw ApiError.invalidHeader();
  }

  const { kEnc, kPos } = deriveKeysFromHeader(passphrase, header);
  const positions = buildPayloadPositions(kPos, carrierCount);

  const payloadBytes = header.ciphertextBytes + GCM_TAG_BYTES;
  if (payloadBytes * 8 > positions.length) {
    throw ApiError.invalidHeader();
  }

  const payloadBits = readBits(view, positions, payloadBytes * 8);
  const payload = bitsToBytes(payloadBits, payloadBytes);
  const ciphertext = payload.slice(0, header.ciphertextBytes);
  const tag = payload.slice(header.ciphertextBytes);

  const plaintext = openMessage(kEnc, header.nonce, ciphertext, tag, headerBytes);
  if (plaintext === null) {
    throw ApiError.extractionFailed();
  }

  const text = new TextDecoder().decode(plaintext);
  return { text, messageBytes: utf8Bytes(text) };
}
