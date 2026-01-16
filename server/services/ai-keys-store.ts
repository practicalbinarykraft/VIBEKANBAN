/**
 * AI Keys Store - Secure storage for user API keys
 *
 * Keys are encrypted using AES-256-GCM before storage.
 * Never returns or logs actual key values except through getKey().
 */
import { db } from "../db";
import { encrypt } from "@/lib/crypto/encrypt";
import { decrypt } from "@/lib/crypto/decrypt";
import crypto from "crypto";
import { sql } from "drizzle-orm";

export type AIProvider = "anthropic" | "openai";

const VALID_PROVIDERS: AIProvider[] = ["anthropic", "openai"];

interface SaveKeyParams {
  userId: string;
  provider: AIProvider;
  apiKey: string;
}

interface KeyIdentifier {
  userId: string;
  provider: AIProvider;
}

interface SaveResult {
  success: boolean;
  error?: string;
}

interface DeleteResult {
  success: boolean;
}

interface KeyStatus {
  anthropic: { configured: boolean };
  openai: { configured: boolean };
}

export async function saveKey(params: SaveKeyParams): Promise<SaveResult> {
  const { userId, provider, apiKey } = params;

  // Validate provider
  if (!VALID_PROVIDERS.includes(provider)) {
    return { success: false, error: "Invalid provider. Must be 'anthropic' or 'openai'" };
  }

  // Validate API key
  if (!apiKey || apiKey.trim() === "") {
    return { success: false, error: "API key cannot be empty" };
  }

  try {
    const ciphertext = encrypt(apiKey);
    const now = Math.floor(Date.now() / 1000);

    // Upsert: insert or update on conflict
    await db.run(sql`
      INSERT INTO user_ai_keys (id, user_id, provider, api_key_ciphertext, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${userId}, ${provider}, ${ciphertext}, ${now}, ${now})
      ON CONFLICT(user_id, provider) DO UPDATE SET
        api_key_ciphertext = ${ciphertext},
        updated_at = ${now}
    `);

    return { success: true };
  } catch (error: any) {
    console.error("Error saving API key:", error.message);
    return { success: false, error: "Failed to save API key" };
  }
}

export async function getKey(params: KeyIdentifier): Promise<string | null> {
  const { userId, provider } = params;

  try {
    const result = await db.all<{ api_key_ciphertext: string }>(sql`
      SELECT api_key_ciphertext FROM user_ai_keys
      WHERE user_id = ${userId} AND provider = ${provider}
      LIMIT 1
    `);

    if (result.length === 0) {
      return null;
    }

    return decrypt(result[0].api_key_ciphertext);
  } catch (error: any) {
    console.error("Error retrieving API key:", error.message);
    return null;
  }
}

export async function deleteKey(params: KeyIdentifier): Promise<DeleteResult> {
  const { userId, provider } = params;

  try {
    await db.run(sql`
      DELETE FROM user_ai_keys
      WHERE user_id = ${userId} AND provider = ${provider}
    `);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting API key:", error.message);
    return { success: false };
  }
}

export async function hasAnyKey(userId: string): Promise<boolean> {
  try {
    const result = await db.all<{ cnt: number }>(sql`
      SELECT COUNT(*) as cnt FROM user_ai_keys
      WHERE user_id = ${userId}
    `);

    return result[0]?.cnt > 0;
  } catch {
    return false;
  }
}

export async function getKeyStatus(userId: string): Promise<KeyStatus> {
  try {
    const result = await db.all<{ provider: string }>(sql`
      SELECT provider FROM user_ai_keys
      WHERE user_id = ${userId}
    `);

    const providers = new Set(result.map((r) => r.provider));

    return {
      anthropic: { configured: providers.has("anthropic") },
      openai: { configured: providers.has("openai") },
    };
  } catch {
    return {
      anthropic: { configured: false },
      openai: { configured: false },
    };
  }
}
