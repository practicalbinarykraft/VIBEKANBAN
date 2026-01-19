/**
 * Provider Adapter Types (PR-52)
 *
 * Interface for provider balance adapters.
 * Each provider (anthropic, openai) has its own adapter implementation.
 */

export type Provider = "anthropic" | "openai";

export type BalanceSource = "provider_api" | "estimator" | "unknown";

/**
 * Result from a provider balance adapter
 */
export type ProviderBalanceResult =
  | { availableUsd: number; source: "provider_api" }
  | { availableUsd: null; source: "unknown" };

/**
 * Interface for provider balance adapters
 */
export interface ProviderBalanceAdapter {
  provider: Provider;
  getBalance(): Promise<ProviderBalanceResult>;
}
