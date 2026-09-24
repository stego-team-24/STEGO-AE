/**
 * Enhanced LSB bit plane. Reference: PRD section 6 (F-03).
 */

import type { ChannelName, PngCarrier } from "@/lib/contracts/types";

export const DEFAULT_LSB_CHANNEL: ChannelName = "b";

const CHANNEL_INDEX: Record<ChannelName, number> = { r: 0, g: 1, b: 2 };

export function lsbPlane(carrier: PngCarrier, channel: ChannelName): PngCarrier {
  const { width, height, channels, data } = carrier;
  const channelIndex = CHANNEL_INDEX[channel];
  const out = new Uint8Array(width * height * 3);

  const pixelCount = width * height;
  for (let p = 0; p < pixelCount; p += 1) {
    const value = (data[p * channels + channelIndex] & 1) === 0 ? 0 : 255;
    const base = p * 3;
    out[base] = value;
    out[base + 1] = value;
    out[base + 2] = value;
  }

  return { width, height, channels: 3, data: out };
}
