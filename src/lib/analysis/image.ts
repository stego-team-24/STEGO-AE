/**
 * Image quality metrics. Reference: PRD section 6 (F-03).
 *
 * MSE over all RGB channels / (W * H * 3); PSNR peak 255.
 */

import type { Metrics, PngCarrier } from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";

export const IMAGE_PEAK = 255;

/** Reject pairs whose dimensions differ instead of resizing. */
export function assertSameDimensions(cover: PngCarrier, stego: PngCarrier): void {
  if (cover.width !== stego.width || cover.height !== stego.height) {
    throw ApiError.mediaMismatch(
      "Cover and stego images must have identical dimensions.",
    );
  }
}

/** Compare RGB8 without alpha. */
export function imageMetrics(cover: PngCarrier, stego: PngCarrier): Metrics {
  assertSameDimensions(cover, stego);
  const { width, height } = cover;
  const coverChannels = cover.channels;
  const stegoChannels = stego.channels;
  const pixelCount = width * height;

  let sum = 0;
  for (let p = 0; p < pixelCount; p += 1) {
    for (let c = 0; c < 3; c += 1) {
      const a = cover.data[p * coverChannels + c];
      const b = stego.data[p * stegoChannels + c];
      const d = a - b;
      sum += d * d;
    }
  }

  const mse = sum / (pixelCount * 3);
  return { mse, psnrDb: psnrFromMse(mse, IMAGE_PEAK), identical: mse === 0 };
}

/** Shared by all metrics: `null` means identical. */
export function psnrFromMse(mse: number, peak: number): number | null {
  if (mse === 0) return null;
  return 10 * Math.log10((peak * peak) / mse);
}
