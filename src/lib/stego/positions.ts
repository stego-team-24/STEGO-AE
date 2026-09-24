/**
 * Carrier positions. Reference: PRD section 7.
 *
 * The 44-byte header occupies the first 352 carrier positions sequentially.
 * The encrypted payload is spread over the remaining carriers using a
 * Fisher-Yates shuffle driven by K_pos.
 */

import { HEADER_CARRIER_BITS } from "@/lib/contracts/types";
import { createWordStream, randomBelow } from "@/lib/crypto/prng";

/**
 * Permutation of the payload carrier indices `[352, carrierCount)`.
 * Identical for embed and extract given the same K_pos and carrierCount.
 */
export function buildPayloadPositions(
  kPos: Uint8Array,
  carrierCount: number,
): Uint32Array {
  const headerBits = HEADER_CARRIER_BITS;
  const count = Math.max(0, carrierCount - headerBits);
  const indices = new Uint32Array(count);
  for (let i = 0; i < count; i += 1) {
    indices[i] = headerBits + i;
  }

  const stream = createWordStream(kPos);
  for (let i = count - 1; i >= 1; i -= 1) {
    const j = randomBelow(stream, i + 1);
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  return indices;
}

export { HEADER_CARRIER_BITS };
