/**
 * Background Job: Refresh AI Provider Balances (PR-54)
 *
 * Usage: npx tsx server/jobs/refresh-ai-balances.ts
 *
 * Refreshes balance info for all AI providers and stores in provider_accounts.
 * Designed to be called from cron or task scheduler.
 */

import { refreshAllProviderBalances, type RefreshResult } from "@/server/services/providers/provider-balance.service";

/**
 * Run the balance refresh job
 * @returns Array of RefreshResult for each provider
 */
export async function run(): Promise<RefreshResult[]> {
  return refreshAllProviderBalances();
}

// Direct execution: npx tsx server/jobs/refresh-ai-balances.ts
if (require.main === module) {
  run()
    .then((results) => {
      for (const r of results) {
        process.stdout.write(
          `${r.provider}: balance=${r.balanceUsd ?? "null"} spend=${r.spendUsd} source=${r.source}\n`
        );
      }
      process.exit(0);
    })
    .catch((err) => {
      process.stderr.write(`Job failed: ${err.message}\n`);
      process.exit(1);
    });
}
