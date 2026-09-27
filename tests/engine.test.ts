import { describe, expect, it } from "vitest";
import type { PngCarrier } from "@/lib/contracts/types";
import { embedImagePayload } from "@/lib/engine/embed";
import { extractImagePayload } from "@/lib/engine/extract";

function makeCarrier(width = 64, height = 64): PngCarrier {
  const data = new Uint8Array(width * height * 3);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (i * 7 + 13) & 0xff;
  }
  return { width, height, channels: 3, data };
}

const PASSPHRASE = "correct horse battery staple";

describe("Embed + extract round-trip", () => {
  it("recovers Unicode text with the correct passphrase", () => {
    const cover = makeCarrier();
    const message = "Stay gold. This is a Unicode test: こんにちは ✓";
    const { carrier } = embedImagePayload(cover, message, PASSPHRASE);
    expect(carrier.data).not.toEqual(cover.data);
    expect(extractImagePayload(carrier, PASSPHRASE).text).toBe(message);
  });

  it("fails safely with a wrong passphrase", () => {
    const cover = makeCarrier();
    const { carrier } = embedImagePayload(cover, "hidden", PASSPHRASE);
    expect(() => extractImagePayload(carrier, "wrong passphrase here")).toThrow(
      /Unable to extract/,
    );
  });

  it("rejects a carrier with a corrupted header", () => {
    const cover = makeCarrier();
    const { carrier } = embedImagePayload(cover, "hidden", PASSPHRASE);
    carrier.data[0] ^= 0x01;
    expect(() => extractImagePayload(carrier, PASSPHRASE)).toThrow(
      /No supported STEGO-AE payload/,
    );
  });

  it("produces different ciphertext for identical inputs (random salt/nonce)", () => {
    const cover = makeCarrier();
    const a = embedImagePayload(cover, "same message", PASSPHRASE);
    const b = embedImagePayload(cover, "same message", PASSPHRASE);
    expect(a.carrier.data).not.toEqual(b.carrier.data);
  });

  it("rejects a message one byte over capacity", () => {
    const cover = makeCarrier(8, 8); // 192 carriers -> 24 raw bytes -> below the 60-byte overhead
    expect(() => embedImagePayload(cover, "x".repeat(100), PASSPHRASE)).toThrow(
      /holds only|capacity/i,
    );
  });
});
