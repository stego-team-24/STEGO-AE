/**
 * Audio analysis. Reference: PRD section 6 (F-05). MSE over every sample value.
 */

import type { Metrics, WavCarrier } from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";
import { psnrFromMse } from "@/lib/analysis/image";

export const PCM_PEAK = 32_768;

export interface AudioComparison {
  metrics: Metrics;
  changedSamples: number;
  totalSamples: number;
}

/** Sample rate, channels, bit depth and frame count must all match. */
export function assertCompatibleWav(cover: WavCarrier, stego: WavCarrier): void {
  if (
    cover.sampleRate !== stego.sampleRate ||
    cover.channels !== stego.channels ||
    cover.frames !== stego.frames
  ) {
    throw ApiError.mediaMismatch(
      "Cover and stego audio must share sample rate, channels and frame count.",
    );
  }
}

export function audioMetrics(cover: WavCarrier, stego: WavCarrier): AudioComparison {
  assertCompatibleWav(cover, stego);
  const totalSamples = cover.frames * cover.channels;

  let sum = 0;
  let changedSamples = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const d = cover.samples[i] - stego.samples[i];
    if (d !== 0) changedSamples += 1;
    sum += d * d;
  }

  const mse = sum / totalSamples;
  return {
    metrics: { mse, psnrDb: psnrFromMse(mse, PCM_PEAK), identical: mse === 0 },
    changedSamples,
    totalSamples,
  };
}

/** True when two interleaved PCM buffers hold identical samples. */
export function samplesIdentical(a: Int16Array, b: Int16Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Amplitude envelope for display only, one value per bucket in [0, 1]. */
export function waveformPreview(carrier: WavCarrier, buckets: number): number[] {
  const totalSamples = carrier.frames * carrier.channels;
  const envelope = new Array<number>(buckets).fill(0);
  const perBucket = Math.max(1, Math.ceil(totalSamples / buckets));

  for (let i = 0; i < totalSamples; i += 1) {
    const bucket = Math.min(buckets - 1, Math.floor(i / perBucket));
    const amplitude = Math.abs(carrier.samples[i]);
    if (amplitude > envelope[bucket]) envelope[bucket] = amplitude;
  }

  for (let b = 0; b < buckets; b += 1) {
    envelope[b] = envelope[b] / PCM_PEAK;
  }

  return envelope;
}
