/**
 * JPEG helpers for the compression attack. Reference: PRD section 6 (F-04).
 * The attack re-encodes the stego PNG and decodes the JPEG back to RGB without
 * resizing, then extraction is attempted on the decoded pixels.
 */

import sharp from "sharp";
import type { PngCarrier } from "@/lib/contracts/types";

export async function encodeJpeg(pngBytes: Uint8Array, quality: number): Promise<Uint8Array> {
  const buffer = await sharp(Buffer.from(pngBytes)).jpeg({ quality }).toBuffer();
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export async function decodeJpegToRgb(bytes: Uint8Array): Promise<PngCarrier> {
  const { data, info } = await sharp(Buffer.from(bytes))
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    channels: 3,
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  };
}
