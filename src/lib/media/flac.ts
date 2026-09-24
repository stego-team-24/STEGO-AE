/**
 * FLAC encode/decode via libflac.js. Reference: PRD section 6 (F-06).
 *
 * PRD planned libflac.js in a browser Worker, but bundling the emscripten
 * runtime under Next 16/Turbopack proved fragile, so FLAC runs in the Node
 * runtime here (a documented, allowed fallback per PRD sections 4 and 11).
 * The PCM integrity contract is unchanged: encode then decode must reproduce
 * the samples bit-exactly.
 */

import { createRequire } from "node:module";

const nodeRequire = createRequire(process.cwd() + "/package.json");

interface FlacInstance {
  isReady(): boolean;
  on(event: string, callback: () => void): void;
}

let flacPromise: Promise<FlacInstance> | null = null;

function loadFlac(): Promise<FlacInstance> {
  if (!flacPromise) {
    flacPromise = new Promise<FlacInstance>((resolve, reject) => {
      try {
        const factory = nodeRequire("libflacjs") as (variant?: string) => FlacInstance;
        const flac = factory();
        const ready = () => resolve(flac);
        if (flac.isReady()) ready();
        else flac.on("ready", ready);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
  return flacPromise;
}

export interface FlacRoundTripOutput {
  flacBytes: Uint8Array;
  decoded: Int16Array;
}

export async function flacRoundTrip(
  samples: Int16Array,
  sampleRate: number,
  channels: number,
  bitsPerSample: 16,
  level: number,
): Promise<FlacRoundTripOutput> {
  const flac = await loadFlac();

  const { Encoder } = nodeRequire("libflacjs/lib/encoder");
  const { Decoder } = nodeRequire("libflacjs/lib/decoder");
  const { exportFlacData } = nodeRequire("libflacjs/lib/utils");

  const i32 = new Int32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    i32[i] = samples[i];
  }

  const encoder = new Encoder(flac, {
    sampleRate,
    channels,
    bitsPerSample,
    compression: level,
    verify: true,
    isOgg: false,
  });
  encoder.encode(i32);
  encoder.encode();
  const metadata = encoder.metadata;
  const flacBytes: Uint8Array = await exportFlacData(encoder.rawData, metadata, false);
  encoder.destroy();

  const decoder = new Decoder(flac, { verify: true, isOgg: false });
  decoder.decode(flacBytes);
  const interleaved: Uint8Array = decoder.getSamples(true);
  decoder.destroy();

  const decoded = new Int16Array(
    interleaved.buffer,
    interleaved.byteOffset,
    interleaved.byteLength / 2,
  );

  return { flacBytes, decoded };
}
