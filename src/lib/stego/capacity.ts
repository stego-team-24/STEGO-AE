/**
 * Capacity arithmetic. Reference: PRD section 7.
 *
 * Raw capacity C = floor(carrierCount / 8).
 * Maximum message bytes = max(0, C - 44 - 16).
 */

import { GCM_TAG_BYTES, HEADER_BYTES } from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";

export const CAPACITY_OVERHEAD_BYTES = HEADER_BYTES + GCM_TAG_BYTES;

export interface Capacity {
  carrierCount: number;
  rawBytes: number;
  headerAndTagBytes: number;
  maxMessageBytes: number;
}

export function computeCapacity(carrierCount: number): Capacity {
  const rawBytes = Math.floor(carrierCount / 8);
  const headerAndTagBytes = CAPACITY_OVERHEAD_BYTES;
  const maxMessageBytes = Math.max(0, rawBytes - headerAndTagBytes);
  return { carrierCount, rawBytes, headerAndTagBytes, maxMessageBytes };
}

/** Throw `ApiError.capacityExceeded` when the message does not fit. */
export function assertCapacity(carrierCount: number, messageBytes: number): void {
  const { maxMessageBytes } = computeCapacity(carrierCount);
  if (messageBytes > maxMessageBytes) {
    throw ApiError.capacityExceeded(
      `Message needs ${messageBytes} bytes but the media holds only ${maxMessageBytes} bytes.`,
    );
  }
}
