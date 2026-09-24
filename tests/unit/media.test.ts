import { describe, expect, it } from "vitest";
import { WaveFile } from "wavefile";
import type { PngCarrier, WavCarrier } from "@/lib/contracts/types";
import { decodePng, encodePng } from "@/lib/media/png";
import { decodeWav, encodeWav } from "@/lib/media/wav";

function makePng(channels: 3 | 4, width = 16, height = 16): PngCarrier {
  const data = new Uint8Array(width * height * channels);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (i * 13 + 29) & 0xff;
  }
  return { width, height, channels, data };
}

describe("PNG round-trip", () => {
  it("preserves RGB bytes exactly", async () => {
    const carrier = makePng(3);
    const bytes = await encodePng(carrier);
    const decoded = await decodePng(bytes);
    expect(decoded.channels).toBe(3);
    expect(decoded.data).toEqual(carrier.data);
  });

  it("preserves the alpha channel exactly", async () => {
    const carrier = makePng(4);
    const bytes = await encodePng(carrier);
    const decoded = await decodePng(bytes);
    expect(decoded.channels).toBe(4);
    expect(decoded.data).toEqual(carrier.data);
  });
});

describe("WAV round-trip", () => {
  it("preserves mono PCM16 samples and metadata", () => {
    const samples = new Int16Array([0, -32768, 32767, 12345, -12345, 1, -1]);
    const carrier: WavCarrier = { sampleRate: 44100, channels: 1, frames: 7, samples };
    const bytes = encodeWav(carrier);
    const decoded = decodeWav(bytes);
    expect(decoded.sampleRate).toBe(44100);
    expect(decoded.channels).toBe(1);
    expect(decoded.frames).toBe(7);
    expect(decoded.samples).toEqual(samples);
  });

  it("preserves stereo interleaved samples", () => {
    const samples = new Int16Array([0, 100, -200, 300, 400, -500, 600, -700, 800, -900]);
    const carrier: WavCarrier = { sampleRate: 48000, channels: 2, frames: 5, samples };
    const bytes = encodeWav(carrier);
    const decoded = decodeWav(bytes);
    expect(decoded.channels).toBe(2);
    expect(decoded.sampleRate).toBe(48000);
    expect(decoded.samples).toEqual(samples);
  });

  it("normalizes float WAV to audible 16-bit PCM instead of silence", () => {
    const wav = new WaveFile();
    const samples = new Float32Array(4410);
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = Math.sin(i / 10) * 0.9;
    }
    wav.fromScratch(1, 44100, "32f", samples);

    const decoded = decodeWav(wav.toBuffer());
    let max = 0;
    for (const value of decoded.samples) {
      if (Math.abs(value) > max) max = Math.abs(value);
    }
    expect(max).toBeGreaterThan(10000);
  });
});
