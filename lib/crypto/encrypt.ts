/**
 * AES-256-GCM encryption utility for API keys
 *
 * Uses VIBE_ENCRYPTION_KEY env var (must be 32+ bytes base64 encoded)
 * Output format: base64(iv + authTag + ciphertext)
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.VIBE_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error("VIBE_ENCRYPTION_KEY environment variable is not set");
  }

  const key = Buffer.from(keyBase64, "base64");

  if (key.length < 32) {
    throw new Error("VIBE_ENCRYPTION_KEY must be at least 32 bytes (base64 encoded)");
  }

  // Use first 32 bytes if longer
  return key.subarray(0, 32);
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine: iv (12) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString("base64");
}
