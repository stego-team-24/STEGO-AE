/**
 * PNG adapter via sharp. Reference: PRD sections 4 and 7.
 *
 * Accepts any PNG up to 1920x1920 (FHD and smaller) and any bit depth or color
 * type. Everything is normalized to 8-bit RGB/RGBA for the LSB carrier: 16-bit
 * is downsampled to 8-bit and grayscale is expanded to RGB, so any photo works
 * without format hunting. Animated PNG is rejected; alpha is preserved but
 * never used as a carrier.
 */

import sharp from "sharp";
import { LIMITS } from "@/lib/contracts/types";
import type { PngCarrier, PngInfo } from "@/lib/contracts/types";
import { ApiError } from "@/lib/contracts/errors";
import { computeCapacity } from "@/lib/stego/capacity";
import type { CarrierView } from "@/lib/stego/bits";

export const PNG_MIME = "image/png";

interface SharpMetadata {
  format?: string;
  width?: number;
  height?: number;
  channels?: number;
  hasAlpha?: boolean;
  pages?: number;
}

async function readMetadata(bytes: Uint8Array): Promise<SharpMetadata> {
  try {
    return (await sharp(Buffer.from(bytes), { animated: false }).metadata()) as unknown as SharpMetadata;
  } catch {
    throw ApiError.unsupportedFormat("The file is not a readable image.");
  }
}

function validateMetadata(meta: SharpMetadata): void {
  if (meta.format !== "png") {
    throw ApiError.unsupportedFormat("Only PNG files are accepted.");
  }
  if (meta.pages && meta.pages > 1) {
    throw ApiError.unsupportedFormat("Animated PNG is not supported.");
  }
  if (meta.width == null || meta.height == null) {
    throw ApiError.unsupportedFormat("Could not read image dimensions.");
  }
  if (
    meta.width > LIMITS.maxImageDimension ||
    meta.height > LIMITS.maxImageDimension
  ) {
    throw ApiError.tooLarge(
      `Image must be at most ${LIMITS.maxImageDimension}x${LIMITS.maxImageDimension} pixels.`,
    );
  }
}

/** Validate the profile and return dimensions and capacity without full decode. */
export async function inspectPng(bytes: Uint8Array): Promise<PngInfo> {
  const meta = await readMetadata(bytes);
  validateMetadata(meta);
  const width = meta.width as number;
  const height = meta.height as number;
  const carrierCount = width * height * 3;
  return {
    width,
    height,
    channels: meta.hasAlpha ? 4 : 3,
    carrierCount,
    capacityBytes: computeCapacity(carrierCount).maxMessageBytes,
  };
}

/** Decode to raw 8-bit interleaved RGB/RGBA pixels. */
export async function decodePng(bytes: Uint8Array): Promise<PngCarrier> {
  const meta = await readMetadata(bytes);
  validateMetadata(meta);

  const { data, info } = await sharp(Buffer.from(bytes))
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  let channels: 3 | 4;
  let out: Uint8Array;

  if (info.channels === 3 || info.channels === 4) {
    channels = info.channels;
    out = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } else if (info.channels === 1) {
    channels = 3;
    out = new Uint8Array(pixels * 3);
    for (let p = 0; p < pixels; p += 1) {
      const v = data[p];
      out[p * 3] = v;
      out[p * 3 + 1] = v;
      out[p * 3 + 2] = v;
    }
  } else if (info.channels === 2) {
    channels = 4;
    out = new Uint8Array(pixels * 4);
    for (let p = 0; p < pixels; p += 1) {
      const v = data[p * 2];
      out[p * 4] = v;
      out[p * 4 + 1] = v;
      out[p * 4 + 2] = v;
      out[p * 4 + 3] = data[p * 2 + 1];
    }
  } else {
    throw ApiError.unsupportedFormat("Unsupported PNG channel layout.");
  }

  return {
    width: info.width,
    height: info.height,
    channels,
    data: out,
  };
}

/** Encode raw pixels back to PNG, preserving channel count and alpha exactly. */
export async function encodePng(carrier: PngCarrier): Promise<Uint8Array> {
  const buffer = await sharp(Buffer.from(carrier.data), {
    raw: { width: carrier.width, height: carrier.height, channels: carrier.channels },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/** PNG data URL thumbnail, longest side at most `maxPx`. Preview only. */
export async function pngThumbnail(
  carrier: PngCarrier,
  maxPx: number,
): Promise<string> {
  const buffer = await sharp(Buffer.from(carrier.data), {
    raw: { width: carrier.width, height: carrier.height, channels: carrier.channels },
  })
    .resize(maxPx, maxPx, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/** Carrier view: logical index walks R, G, B row-major and skips alpha. */
export function pngCarrierView(carrier: PngCarrier): CarrierView {
  const { width, height, channels, data } = carrier;

  const offsetFor = (index: number): number => {
    const pixel = Math.floor(index / 3);
    const channel = index % 3;
    return pixel * channels + channel;
  };

  return {
    length: width * height * 3,
    readLsb(index) {
      return (data[offsetFor(index)] & 1) as 0 | 1;
    },
    writeLsb(index, bit) {
      const offset = offsetFor(index);
      data[offset] = (data[offset] & ~1) | bit;
    },
  };
}
