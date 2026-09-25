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
  meanAbsoluteError: number;
  maxAbsoluteError: number;
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
  let absoluteSum = 0;
  let maxAbsoluteError = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const d = cover.samples[i] - stego.samples[i];
    if (d !== 0) changedSamples += 1;
    sum += d * d;
    absoluteSum += Math.abs(d);
    maxAbsoluteError = Math.max(maxAbsoluteError, Math.abs(d));
  }

  const mse = sum / totalSamples;
  return {
    metrics: { mse, psnrDb: psnrFromMse(mse, PCM_PEAK), identical: mse === 0 },
    changedSamples,
    totalSamples,
    meanAbsoluteError: absoluteSum / totalSamples,
    maxAbsoluteError,
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

/** RMS amplitude per display bucket, normalized to [0, 1]. */
export function waveformPreview(carrier: WavCarrier, buckets: number): number[] {
  const totalSamples = carrier.frames * carrier.channels;
  const sums = new Array<number>(buckets).fill(0);
  const counts = new Array<number>(buckets).fill(0);
  const perBucket = Math.ceil(totalSamples / buckets);

  for (let i = 0; i < totalSamples; i += 1) {
    const bucket = Math.min(buckets - 1, Math.floor(i / perBucket));
    const sample = carrier.samples[i] / PCM_PEAK;
    sums[bucket] += sample * sample;
    counts[bucket] += 1;
  }

  return sums.map((sum, bucket) => counts[bucket] === 0 ? 0 : Math.sqrt(sum / counts[bucket]));
}

/** Fraction of samples changed in each time bucket. */
export function changeRatePreview(cover: WavCarrier, stego: WavCarrier, buckets: number): number[] {
  const totalSamples = cover.frames * cover.channels;
  const changed = new Array<number>(buckets).fill(0);
  const counts = new Array<number>(buckets).fill(0);
  const perBucket = Math.ceil(totalSamples / buckets);
  for (let index = 0; index < totalSamples; index += 1) {
    const bucket = Math.min(buckets - 1, Math.floor(index / perBucket));
    if (cover.samples[index] !== stego.samples[index]) changed[bucket] += 1;
    counts[bucket] += 1;
  }
  return changed.map((value, bucket) => counts[bucket] === 0 ? 0 : value / counts[bucket]);
}
