/**
 * AES-256-GCM decryption utility for API keys
 *
 * Uses VIBE_ENCRYPTION_KEY env var (must be 32+ bytes base64 encoded)
 * Input format: base64(iv + authTag + ciphertext)
 */
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
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

  return key.subarray(0, 32);
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  // Decode base64
  let combined: Buffer;
  try {
    combined = Buffer.from(ciphertext, "base64");
  } catch {
    throw new Error("Invalid ciphertext: not valid base64");
  }

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short");
  }

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    throw new Error("Decryption failed: invalid key or corrupted data");
  }
}
