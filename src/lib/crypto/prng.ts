/**
 * Keystream PRNG. Reference: PRD section 7.
 *
 * HMAC-SHA256(key, counter as 64-bit big-endian, starting at 0) consumed as
 * big-endian uint32 words. Identical between embed and extract.
 */

import crypto from "node:crypto";

const WORDS_PER_BLOCK = 8;

export interface WordStream {
  /** Next uint32 in the keystream. */
  next(): number;
}

export function createWordStream(key: Uint8Array): WordStream {
  let counter = 0n;
  let block = Buffer.alloc(0);
  let offset = WORDS_PER_BLOCK;

  const refill = () => {
    const counterBytes = Buffer.alloc(8);
    counterBytes.writeBigUInt64BE(counter, 0);
    block = crypto
      .createHmac("sha256", Buffer.from(key))
      .update(counterBytes)
      .digest();
    counter += 1n;
    offset = 0;
  };

  return {
    next(): number {
      if (offset >= WORDS_PER_BLOCK) {
        refill();
      }
      const word = block.readUInt32BE(offset * 4);
      offset += 1;
      return word >>> 0;
    },
  };
}

/**
 * Uniform integer in [0, bound) by rejection sampling — never `% bound`, which
 * would bias the shuffle (PRD section 7).
 */
export function randomBelow(stream: WordStream, bound: number): number {
  if (bound <= 0) return 0;
  const range = 0x1_0000_0000; // 2^32
  const limit = Math.floor(range / bound) * bound;
  let value: number;
  do {
    value = stream.next();
  } while (value >= limit);
  return value % bound;
}
