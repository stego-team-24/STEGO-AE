/**
 * Bit plumbing. Reference: PRD section 7.
 *
 * One payload bit lives in the least significant bit of one carrier. Bits are
 * read and written MSB-first. Media differences are hidden behind CarrierView.
 */

export interface CarrierView {
  readonly length: number;
  /** Least significant bit of the carrier at `index`, 0 or 1. */
  readLsb(index: number): 0 | 1;
  /** Replace the least significant bit of the carrier at `index`. */
  writeLsb(index: number, bit: 0 | 1): void;
}

/** Expand bytes to one bit per entry, MSB-first. */
export function bytesToBits(bytes: Uint8Array): Uint8Array {
  const bits = new Uint8Array(bytes.length * 8);
  for (let i = 0; i < bytes.length; i += 1) {
    for (let b = 0; b < 8; b += 1) {
      bits[i * 8 + b] = (bytes[i] >> (7 - b)) & 1;
    }
  }
  return bits;
}

/** Pack MSB-first bits back into `byteLength` bytes. */
export function bitsToBytes(bits: Uint8Array, byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i += 1) {
    let value = 0;
    for (let b = 0; b < 8; b += 1) {
      value = (value << 1) | bits[i * 8 + b];
    }
    bytes[i] = value;
  }
  return bytes;
}

/** Scatter `bits` across the carriers named by `positions`. */
export function embedBits(
  carrier: CarrierView,
  positions: Uint32Array,
  bits: Uint8Array,
): void {
  for (let i = 0; i < bits.length; i += 1) {
    carrier.writeLsb(positions[i], bits[i] === 0 ? 0 : 1);
  }
}

/** Gather `bitCount` bits from the carriers named by `positions`. */
export function readBits(
  carrier: CarrierView,
  positions: Uint32Array,
  bitCount: number,
): Uint8Array {
  const bits = new Uint8Array(bitCount);
  for (let i = 0; i < bitCount; i += 1) {
    bits[i] = carrier.readLsb(positions[i]);
  }
  return bits;
}

/** Write the sequential header bits into the first carrier positions. */
export function embedHeaderBits(
  carrier: CarrierView,
  headerBytes: Uint8Array,
): void {
  const bits = bytesToBits(headerBytes);
  for (let i = 0; i < bits.length; i += 1) {
    carrier.writeLsb(i, bits[i] === 0 ? 0 : 1);
  }
}

/** Read the sequential header bits from the first carrier positions. */
export function readHeaderBits(
  carrier: CarrierView,
  headerByteLength: number,
): Uint8Array {
  const bitCount = headerByteLength * 8;
  const bits = new Uint8Array(bitCount);
  for (let i = 0; i < bitCount; i += 1) {
    bits[i] = carrier.readLsb(i);
  }
  return bitsToBytes(bits, headerByteLength);
}
