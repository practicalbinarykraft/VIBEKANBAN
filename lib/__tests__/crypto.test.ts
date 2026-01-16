import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("crypto", () => {
  const originalEnv = process.env.VIBE_ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a valid 32-byte key (base64 encoded)
    // "this-is-a-32-byte-secret-key!!!!" = 32 bytes
    process.env.VIBE_ENCRYPTION_KEY = "dGhpcy1pcy1hLTMyLWJ5dGUtc2VjcmV0LWtleSEhISE=";
  });

  afterEach(() => {
    process.env.VIBE_ENCRYPTION_KEY = originalEnv;
  });

  describe("encrypt/decrypt roundtrip", () => {
    it("encrypts and decrypts a simple string", async () => {
      const { encrypt } = await import("../crypto/encrypt");
      const { decrypt } = await import("../crypto/decrypt");

      const plaintext = "sk-ant-api03-secret-key-12345";
      const ciphertext = encrypt(plaintext);

      expect(ciphertext).not.toBe(plaintext);
      expect(ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/); // base64

      const decrypted = decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts empty string", async () => {
      const { encrypt } = await import("../crypto/encrypt");
      const { decrypt } = await import("../crypto/decrypt");

      const plaintext = "";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts unicode characters", async () => {
      const { encrypt } = await import("../crypto/encrypt");
      const { decrypt } = await import("../crypto/decrypt");

      const plaintext = "ключ-с-юникодом-🔑";
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertext for same plaintext (random IV)", async () => {
      const { encrypt } = await import("../crypto/encrypt");

      const plaintext = "same-key-twice";
      const ciphertext1 = encrypt(plaintext);
      const ciphertext2 = encrypt(plaintext);

      expect(ciphertext1).not.toBe(ciphertext2);
    });
  });

  describe("wrong key fails", () => {
    it("throws when decrypting with different key", async () => {
      const { encrypt } = await import("../crypto/encrypt");

      const plaintext = "secret-api-key";
      const ciphertext = encrypt(plaintext);

      // Change the key to a different 32-byte key
      // "another-32-byte-secret-key-here!" = 32 bytes
      process.env.VIBE_ENCRYPTION_KEY = "YW5vdGhlci0zMi1ieXRlLXNlY3JldC1rZXktaGVyZSE=";

      // Re-import to get new key
      vi.resetModules();
      const { decrypt } = await import("../crypto/decrypt");

      expect(() => decrypt(ciphertext)).toThrow();
    });

    it("throws when ciphertext is corrupted", async () => {
      const { encrypt } = await import("../crypto/encrypt");
      const { decrypt } = await import("../crypto/decrypt");

      const plaintext = "secret-api-key";
      const ciphertext = encrypt(plaintext);

      // Corrupt the ciphertext
      const corrupted = ciphertext.slice(0, -5) + "XXXXX";

      expect(() => decrypt(corrupted)).toThrow();
    });

    it("throws when ciphertext is not valid base64", async () => {
      const { decrypt } = await import("../crypto/decrypt");

      expect(() => decrypt("not-valid-base64!!!")).toThrow();
    });
  });

  describe("missing encryption key", () => {
    it("throws when VIBE_ENCRYPTION_KEY is not set", async () => {
      delete process.env.VIBE_ENCRYPTION_KEY;
      vi.resetModules();

      const { encrypt } = await import("../crypto/encrypt");

      expect(() => encrypt("test")).toThrow(/VIBE_ENCRYPTION_KEY/);
    });

    it("throws when VIBE_ENCRYPTION_KEY is too short", async () => {
      process.env.VIBE_ENCRYPTION_KEY = "c2hvcnQ="; // "short" - too short
      vi.resetModules();

      const { encrypt } = await import("../crypto/encrypt");

      expect(() => encrypt("test")).toThrow(/32/);
    });
  });
});
