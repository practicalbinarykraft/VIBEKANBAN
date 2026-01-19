/**
 * Anthropic Balance Adapter (PR-52)
 *
 * Adapter for fetching Anthropic account balance.
 *
 * NOTE: As of January 2025, Anthropic API does NOT provide a balance endpoint.
 * There is no documented way to programmatically fetch account balance/credits.
 * This adapter returns { availableUsd: null, source: "unknown" }.
 *
 * When/if Anthropic adds a balance API, this adapter should be updated to:
 * 1. Call the balance endpoint
 * 2. Return { availableUsd: <amount>, source: "provider_api" }
 */

import type { ProviderBalanceResult } from "../provider-adapter";

/**
 * Get Anthropic account balance
 *
 * @returns Promise<ProviderBalanceResult> - Always returns unknown/null since
 *          Anthropic doesn't provide a balance API endpoint.
 */
export async function getAnthropicBalance(): Promise<ProviderBalanceResult> {
  // Anthropic API does NOT provide a balance/credits endpoint.
  // There is no way to programmatically check account balance.
  // This is a known limitation as of January 2025.
  //
  // Future work: Monitor Anthropic API docs for billing endpoints.
  // If added, implement actual API call here.
  return {
    availableUsd: null,
    source: "unknown",
  };
}
