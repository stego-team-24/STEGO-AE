import { Mp3Encoder } from "@breezystack/lamejs";
import { MPEGDecoder } from "mpg123-decoder";
import { ApiError } from "@/lib/contracts/errors";
import type { WavCarrier } from "@/lib/contracts/types";

const MP3_BITRATE_KBPS = 128;
const SUPPORTED_SAMPLE_RATES = new Set([8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000]);

export async function encodeMp3(carrier: WavCarrier): Promise<Uint8Array> {
  if (carrier.channels !== 1 && carrier.channels !== 2) {
    throw ApiError.unsupportedFormat("MP3 compression supports mono or stereo WAV files.");
  }
  if (!SUPPORTED_SAMPLE_RATES.has(carrier.sampleRate)) {
    throw ApiError.unsupportedFormat("MP3 compression does not support this WAV sample rate.");
  }

  const encoder = new Mp3Encoder(carrier.channels, carrier.sampleRate, MP3_BITRATE_KBPS);
  const chunks: Uint8Array[] = [];
  const blockFrames = 1152;
  for (let start = 0; start < carrier.frames; start += blockFrames) {
    const frames = Math.min(blockFrames, carrier.frames - start);
    const left = new Int16Array(frames);
    const right = carrier.channels === 2 ? new Int16Array(frames) : undefined;
    for (let frame = 0; frame < frames; frame += 1) {
      left[frame] = carrier.samples[(start + frame) * carrier.channels];
      if (right) right[frame] = carrier.samples[(start + frame) * carrier.channels + 1];
    }
    const chunk = encoder.encodeBuffer(left, right);
    if (chunk.length) chunks.push(chunk);
  }
  const finalChunk = encoder.flush();
  if (finalChunk.length) chunks.push(finalChunk);
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}

/** Decode MP3 and align its lossy output to the original WAV duration/format. */
export async function decodeMp3ToCarrier(bytes: Uint8Array, source: WavCarrier): Promise<WavCarrier> {
  const decoder = new MPEGDecoder({ enableGapless: true });
  await decoder.ready;
  let decoded;
  try {
    decoded = decoder.decode(bytes);
  } finally {
    decoder.free();
  }
  // mpg123-decoder exposes two channel buffers even for mono MPEG streams.
  // Normalize that output to the carrier's channel layout before resampling.
  if ((decoded.channelData.length !== 1 && decoded.channelData.length !== 2) || decoded.sampleRate <= 0 || decoded.samplesDecoded <= 0) {
    throw ApiError.mediaMismatch("Decoded MP3 channel layout is incompatible with the source WAV.");
  }

  const samples = new Int16Array(source.frames * source.channels);
  const sourceFrames = Math.min(decoded.samplesDecoded, ...decoded.channelData.map((channel) => channel.length));
  if (sourceFrames <= 0) {
    throw ApiError.mediaMismatch("The compressed MP3 contains no decodable audio samples.");
  }
  for (let frame = 0; frame < source.frames; frame += 1) {
    const position = frame * decoded.sampleRate / source.sampleRate;
    const lower = Math.min(sourceFrames - 1, Math.floor(position));
    const upper = Math.min(sourceFrames - 1, lower + 1);
    const fraction = Math.min(1, position - lower);
    const left = decoded.channelData[0];
    const right = decoded.channelData[1] ?? left;
    const leftValue = left[lower] * (1 - fraction) + left[upper] * fraction;
    const rightValue = right[lower] * (1 - fraction) + right[upper] * fraction;
    for (let channel = 0; channel < source.channels; channel += 1) {
      const value = source.channels === 1 ? (leftValue + rightValue) / 2 : channel === 0 ? leftValue : rightValue;
      samples[frame * source.channels + channel] = Math.max(-32768, Math.min(32767, Math.round(value * 32768)));
    }
  }
  return { ...source, samples };
}

export { MP3_BITRATE_KBPS };
