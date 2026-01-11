/**
 * GitHub Webhook Signature Verification
 *
 * Responsibility: Verify HMAC SHA256 signatures from GitHub webhooks
 *
 * Why separate file:
 * - Single responsibility: security validation only
 * - Reusable across different webhook handlers
 * - Easy to test in isolation
 * - Keeps main route file under 200 LOC
 *
 * Security: Uses constant-time comparison to prevent timing attacks
 */

import crypto from 'crypto';

export interface VerifySignatureParams {
  secret: string;
  rawBody: string;
  signatureHeader: string | null;
}

/**
 * Verify GitHub webhook signature using HMAC SHA256
 *
 * GitHub sends signature in header: X-Hub-Signature-256: sha256=<hash>
 * We compute HMAC SHA256 of raw body with webhook secret and compare
 *
 * Why constant-time compare:
 * - Prevents timing attacks where attacker learns signature byte-by-byte
 * - crypto.timingSafeEqual ensures comparison takes same time regardless of match
 *
 * @throws Error if signature header format is invalid
 * @returns true if signature is valid, false otherwise
 */
export function verifyGitHubSignature({
  secret,
  rawBody,
  signatureHeader,
}: VerifySignatureParams): boolean {
  // No signature provided
  if (!signatureHeader) {
    return false;
  }

  // GitHub signature format: "sha256=<hash>"
  if (!signatureHeader.startsWith('sha256=')) {
    throw new Error('Invalid signature format. Expected: sha256=<hash>');
  }

  // Extract hash from header
  const receivedHash = signatureHeader.substring(7); // Remove "sha256=" prefix

  // Compute expected hash
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // Constant-time comparison (prevents timing attacks)
  try {
    const receivedBuffer = Buffer.from(receivedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    // Both buffers must be same length for timingSafeEqual
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch (error) {
    // Invalid hex string or other error
    return false;
  }
}

/**
 * Check if we're in test mode (signature validation bypassed)
 *
 * Why bypass in tests:
 * - E2E tests don't have real GitHub webhook secret
 * - Tests should be deterministic and not depend on external secrets
 * - Production validation is tested separately with known secret
 */
export function isTestMode(): boolean {
  return process.env.PLAYWRIGHT === '1' || process.env.NODE_ENV === 'test';
}
