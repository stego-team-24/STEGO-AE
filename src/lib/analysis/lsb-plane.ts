/**
 * Enhanced LSB bit plane. Reference: PRD section 6 (F-03).
 */

import type { PngCarrier } from "@/lib/contracts/types";

/** Show all three LSB planes together as RGB instead of splitting channels. */
export function lsbPlaneCombined(carrier: PngCarrier): PngCarrier {
  const { width, height, channels, data } = carrier;
  const out = new Uint8Array(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * channels;
    const target = pixel * 3;
    out[target] = (data[source] & 1) ? 255 : 0;
    out[target + 1] = (data[source + 1] & 1) ? 255 : 0;
    out[target + 2] = (data[source + 2] & 1) ? 255 : 0;
  }
  return { width, height, channels: 3, data: out };
}

export function lsbPlane(carrier: PngCarrier, channel: 0 | 1 | 2): PngCarrier {
  const { width, height, channels, data } = carrier;
  const out = new Uint8Array(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const value = (data[pixel * channels + channel] & 1) ? 255 : 0;
    const target = pixel * 3;
    out[target] = value;
    out[target + 1] = value;
    out[target + 2] = value;
  }
  return { width, height, channels: 3, data: out };
}
