import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { initDB } from "../../db";
import {
  saveKey,
  getKey,
  deleteKey,
  hasAnyKey,
  getKeyStatus,
  AIProvider,
} from "../ai-keys-store";

// Set encryption key for tests
process.env.VIBE_ENCRYPTION_KEY = "dGhpcy1pcy1hLTMyLWJ5dGUtc2VjcmV0LWtleSEhISE=";

describe("ai-keys-store", () => {
  beforeAll(() => {
    initDB();
  });

  beforeEach(() => {
    // Clear user_ai_keys table before each test
    const sqlite = new Database("data/vibe-kanban.db");
    sqlite.exec("DELETE FROM user_ai_keys");
    sqlite.close();
  });

  describe("saveKey", () => {
    it("saves a new API key", async () => {
      const result = await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "sk-ant-api03-test-key-12345",
      });

      expect(result.success).toBe(true);
    });

    it("updates existing key for same user/provider", async () => {
      await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "sk-ant-old-key",
      });

      await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "sk-ant-new-key",
      });

      const key = await getKey({ userId: "local", provider: "anthropic" });
      expect(key).toBe("sk-ant-new-key");
    });

    it("saves keys for different providers independently", async () => {
      await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "sk-ant-key",
      });

      await saveKey({
        userId: "local",
        provider: "openai",
        apiKey: "sk-openai-key",
      });

      const anthropicKey = await getKey({ userId: "local", provider: "anthropic" });
      const openaiKey = await getKey({ userId: "local", provider: "openai" });

      expect(anthropicKey).toBe("sk-ant-key");
      expect(openaiKey).toBe("sk-openai-key");
    });

    it("rejects invalid provider", async () => {
      const result = await saveKey({
        userId: "local",
        provider: "invalid" as AIProvider,
        apiKey: "some-key",
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid provider/i);
    });

    it("rejects empty API key", async () => {
      const result = await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/empty/i);
    });
  });

  describe("getKey", () => {
    it("returns decrypted key when exists", async () => {
      await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "sk-ant-secret-key-xyz",
      });

      const key = await getKey({ userId: "local", provider: "anthropic" });
      expect(key).toBe("sk-ant-secret-key-xyz");
    });

    it("returns null when key does not exist", async () => {
      const key = await getKey({ userId: "local", provider: "anthropic" });
      expect(key).toBeNull();
    });

    it("returns null for different user", async () => {
      await saveKey({
        userId: "user1",
        provider: "anthropic",
        apiKey: "sk-ant-key",
      });

      const key = await getKey({ userId: "user2", provider: "anthropic" });
      expect(key).toBeNull();
    });
  });

  describe("deleteKey", () => {
    it("deletes existing key", async () => {
      await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "sk-ant-key",
      });

      const result = await deleteKey({ userId: "local", provider: "anthropic" });
      expect(result.success).toBe(true);

      const key = await getKey({ userId: "local", provider: "anthropic" });
      expect(key).toBeNull();
    });

    it("succeeds even when key does not exist", async () => {
      const result = await deleteKey({ userId: "local", provider: "anthropic" });
      expect(result.success).toBe(true);
    });

    it("only deletes specified provider key", async () => {
      await saveKey({ userId: "local", provider: "anthropic", apiKey: "ant-key" });
      await saveKey({ userId: "local", provider: "openai", apiKey: "oai-key" });

      await deleteKey({ userId: "local", provider: "anthropic" });

      const anthropicKey = await getKey({ userId: "local", provider: "anthropic" });
      const openaiKey = await getKey({ userId: "local", provider: "openai" });

      expect(anthropicKey).toBeNull();
      expect(openaiKey).toBe("oai-key");
    });
  });

  describe("hasAnyKey", () => {
    it("returns false when no keys configured", async () => {
      const result = await hasAnyKey("local");
      expect(result).toBe(false);
    });

    it("returns true when anthropic key configured", async () => {
      await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "sk-ant-key",
      });

      const result = await hasAnyKey("local");
      expect(result).toBe(true);
    });

    it("returns true when openai key configured", async () => {
      await saveKey({
        userId: "local",
        provider: "openai",
        apiKey: "sk-openai-key",
      });

      const result = await hasAnyKey("local");
      expect(result).toBe(true);
    });
  });

  describe("getKeyStatus", () => {
    it("returns not configured for both when no keys", async () => {
      const status = await getKeyStatus("local");

      expect(status.anthropic.configured).toBe(false);
      expect(status.openai.configured).toBe(false);
    });

    it("returns configured for anthropic when key exists", async () => {
      await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "sk-ant-key",
      });

      const status = await getKeyStatus("local");

      expect(status.anthropic.configured).toBe(true);
      expect(status.openai.configured).toBe(false);
    });

    it("returns configured for both when both keys exist", async () => {
      await saveKey({ userId: "local", provider: "anthropic", apiKey: "ant" });
      await saveKey({ userId: "local", provider: "openai", apiKey: "oai" });

      const status = await getKeyStatus("local");

      expect(status.anthropic.configured).toBe(true);
      expect(status.openai.configured).toBe(true);
    });

    it("does not return actual key values", async () => {
      await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: "sk-ant-secret-12345",
      });

      const status = await getKeyStatus("local");

      // Status should only have configured boolean, no key
      expect(status.anthropic).toEqual({ configured: true });
      expect("apiKey" in status.anthropic).toBe(false);
      expect("key" in status.anthropic).toBe(false);
    });
  });

  describe("encryption", () => {
    it("stores encrypted value in database, not plaintext", async () => {
      const plainKey = "sk-ant-plaintext-secret-key";

      await saveKey({
        userId: "local",
        provider: "anthropic",
        apiKey: plainKey,
      });

      // Query raw DB to verify encryption
      const sqlite = new Database("data/vibe-kanban.db");
      const row = sqlite
        .prepare("SELECT api_key_ciphertext FROM user_ai_keys WHERE user_id = ? AND provider = ?")
        .get("local", "anthropic") as { api_key_ciphertext: string } | undefined;

      expect(row).toBeDefined();
      expect(row!.api_key_ciphertext).not.toBe(plainKey);
      expect(row!.api_key_ciphertext).not.toContain("plaintext");
      expect(row!.api_key_ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/); // base64

      sqlite.close();
    });
  });
});
