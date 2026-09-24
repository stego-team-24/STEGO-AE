import { describe, expect, it } from "vitest";
import { flacRoundTrip } from "@/lib/media/flac";
import { samplesIdentical } from "@/lib/analysis/audio";

describe("FLAC lossless round-trip", () => {
  it("reproduces PCM16 samples bit-exactly", async () => {
    const n = 2000;
    const samples = new Int16Array(n);
    for (let i = 0; i < n; i += 1) {
      samples[i] = Math.round(Math.sin((i / 44100) * 2 * Math.PI * 440) * 12000);
    }

    const { flacBytes, decoded } = await flacRoundTrip(samples, 44100, 1, 16, 5);

    expect(flacBytes.length).toBeGreaterThan(0);
    expect(decoded).toHaveLength(n);
    expect(samplesIdentical(samples, decoded)).toBe(true);
  });
});
