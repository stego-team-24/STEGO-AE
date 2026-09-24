/**
 * Embedding entry points. Reference: PRD section 7. The input carrier is never
 * mutated; a fresh copy is returned.
 */

import type { PayloadHeader, PngCarrier, WavCarrier } from "@/lib/contracts/types";
import { pngCarrierView } from "@/lib/media/png";
import { wavCarrierView } from "@/lib/media/wav";
import { embedIntoCarrier } from "@/lib/engine/core";

export interface EmbedResult<C> {
  /** A new carrier holding the payload. */
  carrier: C;
  header: PayloadHeader;
  /** UTF-8 byte length of the plaintext. */
  messageBytes: number;
}

export function embedImagePayload(
  carrier: PngCarrier,
  message: string,
  passphrase: string,
): EmbedResult<PngCarrier> {
  const out: PngCarrier = { ...carrier, data: new Uint8Array(carrier.data) };
  const view = pngCarrierView(out);
  const carrierCount = out.width * out.height * 3;
  const { header, messageBytes } = embedIntoCarrier(
    view,
    carrierCount,
    "image",
    message,
    passphrase,
  );
  return { carrier: out, header, messageBytes };
}

export function embedAudioPayload(
  carrier: WavCarrier,
  message: string,
  passphrase: string,
): EmbedResult<WavCarrier> {
  const out: WavCarrier = { ...carrier, samples: new Int16Array(carrier.samples) };
  const view = wavCarrierView(out);
  const carrierCount = out.frames * out.channels;
  const { header, messageBytes } = embedIntoCarrier(
    view,
    carrierCount,
    "audio",
    message,
    passphrase,
  );
  return { carrier: out, header, messageBytes };
}
