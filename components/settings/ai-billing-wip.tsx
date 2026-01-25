/**
 * AI Billing WIP Component (PR-125)
 *
 * Placeholder for billing UI while we don't have reliable billing data.
 * Anthropic does not provide a balance/credits API, so we cannot show
 * accurate billing information. This replaces the misleading estimator-based UI.
 */

import { DollarSign, Construction, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AiBillingWip() {
  return (
    <div
      className="rounded-lg border bg-card p-6"
      data-testid="ai-billing-wip"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">AI Billing & Usage</h2>
            <p className="text-sm text-muted-foreground">Usage tracking and spend</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Construction className="h-3 w-3" />
          In development
        </Badge>
      </div>

      <div className="rounded-md border border-dashed p-4 bg-muted/30">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Accurate billing data is not available yet.</strong>
          </p>
          <p>
            Anthropic does not provide an API to fetch credit balance or usage data.
            We will enable this section once a reliable billing source is implemented.
          </p>
          <p className="flex items-center gap-1 pt-2 border-t border-dashed">
            <ExternalLink className="h-3.5 w-3.5" />
            For now, check usage in your provider dashboard:
          </p>
          <ul className="list-disc list-inside pl-1 space-y-1">
            <li>
              <a
                href="https://console.anthropic.com/settings/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Anthropic Console
              </a>
            </li>
            <li>
              <a
                href="https://platform.openai.com/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenAI Usage
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
