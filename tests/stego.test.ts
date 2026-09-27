import { describe, expect, it } from "vitest";
import {
  HEADER_BYTES,
  KDF_ITERATIONS,
  MEDIA_CODE,
  PROTOCOL_VERSION,
  type PayloadHeader,
} from "@/lib/contracts/types";
import { encodeHeader, decodeHeader } from "@/lib/stego/header";
import { bytesToBits, bitsToBytes } from "@/lib/stego/bits";
import { buildPayloadPositions } from "@/lib/stego/positions";
import { assertCapacity, computeCapacity } from "@/lib/stego/capacity";

function makeHeader(): PayloadHeader {
  return {
    version: PROTOCOL_VERSION,
    mediaCode: MEDIA_CODE.image,
    kdfId: 1,
    flags: 0,
    iterations: KDF_ITERATIONS,
    ciphertextBytes: 128,
    salt: new Uint8Array(16).fill(3),
    nonce: new Uint8Array(12).fill(5),
  };
}

describe("Header v1", () => {
  it("encodes and decodes to 44 bytes exactly", () => {
    const bytes = encodeHeader(makeHeader());
    expect(bytes).toHaveLength(HEADER_BYTES);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("SGAE");
    const decoded = decodeHeader(bytes);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.header.ciphertextBytes).toBe(128);
      expect(decoded.header.mediaCode).toBe(MEDIA_CODE.image);
    }
  });

  it("rejects a too-short buffer before allocation", () => {
    expect(decodeHeader(new Uint8Array(10))).toEqual({ ok: false, reason: "TOO_SHORT" });
  });

  it("rejects bad magic", () => {
    const bytes = encodeHeader(makeHeader());
    bytes[0] = 0x58;
    expect(decodeHeader(bytes)).toEqual({ ok: false, reason: "BAD_MAGIC" });
  });

  it("rejects unsupported iterations", () => {
    const bytes = encodeHeader(makeHeader());
    const view = new DataView(bytes.buffer);
    view.setUint32(8, 1, false);
    expect(decodeHeader(bytes)).toEqual({ ok: false, reason: "BAD_ITERATIONS" });
  });
});

describe("Capacity", () => {
  it("computes C - 44 - 16", () => {
    // 8000 carriers -> 1000 raw bytes -> 940 max message bytes
    expect(computeCapacity(8000)).toMatchObject({
      rawBytes: 1000,
      maxMessageBytes: 940,
    });
  });

  it("accepts exactly N and rejects N+1", () => {
    expect(() => assertCapacity(8000, 940)).not.toThrow();
    expect(() => assertCapacity(8000, 941)).toThrow();
  });
});

describe("Bits", () => {
  it("round-trips MSB-first", () => {
    const bytes = new Uint8Array([0b10110010, 0b00001111, 0xff, 0x00]);
    const bits = bytesToBits(bytes);
    expect(bits[0]).toBe(1);
    expect(bits[1]).toBe(0);
    expect(bitsToBytes(bits, bytes.length)).toEqual(bytes);
  });
});

describe("Position shuffle", () => {
  it("is a permutation of the payload indices and is deterministic", () => {
    const kPos = new Uint8Array(32).fill(0x42);
    const count = 1000;
    const a = buildPayloadPositions(kPos, count);
    const b = buildPayloadPositions(kPos, count);
    expect(a).toHaveLength(count - 352);
    expect(a).toEqual(b);

    const seen = new Set<number>();
    for (const value of a) {
      expect(value).toBeGreaterThanOrEqual(352);
      expect(value).toBeLessThan(count);
      seen.add(value);
    }
    expect(seen.size).toBe(a.length);
  });
});
