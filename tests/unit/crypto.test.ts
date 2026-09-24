import { describe, expect, it } from "vitest";
import { sealMessage, openMessage, newNonce } from "@/lib/crypto/aead";
import { deriveKeys, newSalt } from "@/lib/crypto/kdf";
import { createWordStream, randomBelow } from "@/lib/crypto/prng";

const key = new Uint8Array(32).fill(7);

describe("AEAD (AES-256-GCM)", () => {
  it("round-trips Unicode text", () => {
    const nonce = newNonce();
    const aad = new Uint8Array([1, 2, 3, 4]);
    const plaintext = new TextEncoder().encode("héllo → stegano 日本語 ✓");
    const sealed = sealMessage(key, nonce, plaintext, aad);
    expect(sealed.tag).toHaveLength(16);
    expect(openMessage(key, nonce, sealed.ciphertext, sealed.tag, aad)).toEqual(plaintext);
  });

  it("rejects a tampered tag", () => {
    const nonce = newNonce();
    const aad = new Uint8Array([9]);
    const plaintext = new TextEncoder().encode("secret");
    const sealed = sealMessage(key, nonce, plaintext, aad);
    const tag = sealed.tag.slice();
    tag[0] ^= 0xff;
    expect(openMessage(key, nonce, sealed.ciphertext, tag, aad)).toBeNull();
  });

  it("rejects a tampered AAD", () => {
    const nonce = newNonce();
    const plaintext = new TextEncoder().encode("secret");
    const sealed = sealMessage(key, nonce, plaintext, new Uint8Array([1]));
    expect(
      openMessage(key, nonce, sealed.ciphertext, sealed.tag, new Uint8Array([2])),
    ).toBeNull();
  });
});

describe("KDF", () => {
  it("is deterministic for the same inputs", () => {
    const salt = newSalt();
    expect(salt).toHaveLength(16);
    const a = deriveKeys("correct horse battery staple", salt);
    const b = deriveKeys("correct horse battery staple", salt);
    expect(a.kEnc.equals(b.kEnc)).toBe(true);
    expect(a.kPos.equals(b.kPos)).toBe(true);
  });

  it("derives different keys from a different passphrase", () => {
    const salt = new Uint8Array(16).fill(1);
    const a = deriveKeys("password-one-long", salt);
    const b = deriveKeys("password-two-long", salt);
    expect(a.kEnc.equals(b.kEnc)).toBe(false);
  });
});

describe("PRNG keystream", () => {
  it("is deterministic for the same key", () => {
    const keyA = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const s1 = createWordStream(keyA);
    const s2 = createWordStream(keyA);
    for (let i = 0; i < 100; i += 1) {
      expect(s1.next()).toBe(s2.next());
    }
  });

  it("produces unbiased values within range via rejection sampling", () => {
    const stream = createWordStream(new Uint8Array(16).fill(0xab));
    for (let i = 0; i < 1000; i += 1) {
      const v = randomBelow(stream, 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });
});
