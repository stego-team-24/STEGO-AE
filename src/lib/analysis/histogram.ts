/**
 * RGB histogram. Reference: PRD section 6 (F-03). 256 bins per channel.
 */

import type { PngCarrier, RgbHistogram } from "@/lib/contracts/types";

export const HISTOGRAM_BINS = 256;

export function rgbHistogram(carrier: PngCarrier): RgbHistogram {
  const r = new Array<number>(HISTOGRAM_BINS).fill(0);
  const g = new Array<number>(HISTOGRAM_BINS).fill(0);
  const b = new Array<number>(HISTOGRAM_BINS).fill(0);

  const channels = carrier.channels;
  const pixelCount = carrier.width * carrier.height;
  for (let p = 0; p < pixelCount; p += 1) {
    const base = p * channels;
    r[carrier.data[base]] += 1;
    g[carrier.data[base + 1]] += 1;
    b[carrier.data[base + 2]] += 1;
  }

  return { r, g, b };
}
