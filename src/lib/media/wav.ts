/**
 * WAV adapter via wavefile. Reference: PRD sections 4 and 7.
 *
 * Accepts any RIFF/RIFX WAVE that wavefile can parse (any sample rate, channel
 * count, integer or float bit depth). Samples are normalized to signed 16-bit
 * PCM for the LSB carrier, so any audio file works without format hunting. The
 * stego output is written back as 16-bit PCM WAV.
 */

import { WaveFile } from "wavefile";
import type { WavCarrier, WavInfo } from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";
import { computeCapacity } from "@/lib/stego/capacity";
import type { CarrierView } from "@/lib/stego/bits";

export const WAV_MIME = "audio/wav";

interface WavFmt {
  numChannels: number;
  sampleRate: number;
}

function readWav(bytes: Uint8Array): WaveFile {
  try {
    return new WaveFile(Buffer.from(bytes));
  } catch {
    throw ApiError.unsupportedFormat("The file is not a readable WAV file.");
  }
}

function toPcm16(wav: WaveFile): Int16Array {
  try {
    // Normalize any source (float, 8/24/32-bit) to signed 16-bit PCM first;
    // getSamples(Int16Array) alone returns zeros for float input.
    wav.toBitDepth("16", true);
    return wav.getSamples(true, Int16Array) as unknown as Int16Array;
  } catch {
    throw ApiError.unsupportedFormat("Could not decode WAV samples.");
  }
}

/** Validate the format and return PCM metadata and capacity. */
export function inspectWav(bytes: Uint8Array): WavInfo {
  const wav = readWav(bytes);
  const { numChannels, sampleRate } = readFmt(wav);
  const samples = toPcm16(wav);
  const frames = Math.floor(samples.length / numChannels);
  const carrierCount = samples.length;
  return {
    sampleRate,
    channels: numChannels,
    frames,
    bitDepth: 16,
    carrierCount,
    capacityBytes: computeCapacity(carrierCount).maxMessageBytes,
  };
}

/** Decode to interleaved signed 16-bit samples (normalized). */
export function decodeWav(bytes: Uint8Array): WavCarrier {
  const wav = readWav(bytes);
  const { numChannels, sampleRate } = readFmt(wav);
  const samples = toPcm16(wav);
  const frames = Math.floor(samples.length / numChannels);
  return {
    sampleRate,
    channels: numChannels,
    frames,
    samples,
  };
}

/** Snapshot channel count and sample rate before any conversion mutates the fmt object. */
function readFmt(wav: WaveFile): { numChannels: number; sampleRate: number } {
  const fmt = wav.fmt as unknown as WavFmt;
  const numChannels = fmt.numChannels;
  const sampleRate = fmt.sampleRate;
  if (!numChannels || numChannels < 1 || !sampleRate || sampleRate < 1) {
    throw ApiError.unsupportedFormat("Invalid WAV format.");
  }
  return { numChannels, sampleRate };
}

/** Serialize back to PCM16 WAV with the same sample rate, channels and frame count. */
export function encodeWav(carrier: WavCarrier): Uint8Array {
  const wav = new WaveFile();
  wav.fromScratch(carrier.channels, carrier.sampleRate, "16", carrier.samples);
  return wav.toBuffer();
}

/** Carrier view: one logical carrier per 16-bit sample. */
export function wavCarrierView(carrier: WavCarrier): CarrierView {
  const { samples } = carrier;
  return {
    length: carrier.frames * carrier.channels,
    readLsb(index) {
      return (samples[index] & 1) as 0 | 1;
    },
    writeLsb(index, bit) {
      samples[index] = (samples[index] & ~1) | bit;
    },
  };
}
