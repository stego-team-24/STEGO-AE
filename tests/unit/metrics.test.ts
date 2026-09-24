import { describe, expect, it } from "vitest";
import type { PngCarrier, WavCarrier } from "@/lib/contracts/types";
import { imageMetrics, psnrFromMse } from "@/lib/analysis/image";
import { audioMetrics } from "@/lib/analysis/audio";

describe("Image metrics", () => {
  it("computes MSE over all RGB channels", () => {
    const cover: PngCarrier = { width: 1, height: 1, channels: 3, data: new Uint8Array([0, 0, 0]) };
    const stego: PngCarrier = { width: 1, height: 1, channels: 3, data: new Uint8Array([0, 0, 1]) };
    const metrics = imageMetrics(cover, stego);
    expect(metrics.mse).toBeCloseTo(1 / 3);
    expect(metrics.identical).toBe(false);
    expect(metrics.psnrDb).not.toBeNull();
  });

  it("reports identical images as MSE 0 and null PSNR", () => {
    const cover: PngCarrier = { width: 2, height: 2, channels: 3, data: new Uint8Array(12).fill(200) };
    const metrics = imageMetrics(cover, cover);
    expect(metrics.mse).toBe(0);
    expect(metrics.identical).toBe(true);
    expect(metrics.psnrDb).toBeNull();
  });
});

describe("PSNR helper", () => {
  it("returns null for MSE 0 and the peak formula otherwise", () => {
    expect(psnrFromMse(0, 255)).toBeNull();
    expect(psnrFromMse(1, 255)).toBeCloseTo(10 * Math.log10(255 * 255));
  });
});

describe("Audio metrics", () => {
  it("uses the explicit PCM peak and counts changed samples", () => {
    const cover: WavCarrier = {
      sampleRate: 44100,
      channels: 1,
      frames: 2,
      samples: new Int16Array([0, 100]),
    };
    const stego: WavCarrier = {
      sampleRate: 44100,
      channels: 1,
      frames: 2,
      samples: new Int16Array([0, 101]),
    };
    const { metrics, changedSamples, totalSamples } = audioMetrics(cover, stego);
    expect(totalSamples).toBe(2);
    expect(changedSamples).toBe(1);
    expect(metrics.mse).toBeCloseTo(0.5);
    expect(metrics.psnrDb).toBeCloseTo(10 * Math.log10(32768 * 32768 * 2));
  });
});
