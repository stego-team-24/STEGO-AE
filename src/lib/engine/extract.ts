/**
 * Extraction entry points. Reference: PRD section 7.
 *
 * Failures throw `ApiError.invalidHeader()` (no supported payload) or
 * `ApiError.extractionFailed()` (authentication failed).
 */

import type { ExtractResponse, PngCarrier, WavCarrier } from "@/lib/contracts/types";
import { pngCarrierView } from "@/lib/media/png";
import { wavCarrierView } from "@/lib/media/wav";
import { extractFromCarrier } from "@/lib/engine/core";

export function extractImagePayload(
  carrier: PngCarrier,
  passphrase: string,
): ExtractResponse {
  const view = pngCarrierView(carrier);
  const carrierCount = carrier.width * carrier.height * 3;
  return extractFromCarrier(view, carrierCount, "image", passphrase);
}

export function extractAudioPayload(
  carrier: WavCarrier,
  passphrase: string,
): ExtractResponse {
  const view = wavCarrierView(carrier);
  const carrierCount = carrier.frames * carrier.channels;
  return extractFromCarrier(view, carrierCount, "audio", passphrase);
}
