/**
 * ConfiguredApiKeys Component (PR-123)
 *
 * Displays list of configured BYOK API keys with masked values.
 * Allows user to see which providers are configured and remove keys.
 */

"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Trash2, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfiguredProvider {
  provider: string;
  keyPresent: boolean;
  keyMasked: string | null;
}

interface ConfiguredApiKeysProps {
  configuredProviders: ConfiguredProvider[];
  onKeyRemoved: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
};

export function ConfiguredApiKeys({ configuredProviders, onKeyRemoved }: ConfiguredApiKeysProps) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async (provider: string) => {
    setRemoving(provider);
    setError(null);

    try {
      const response = await fetch(`/api/settings/api-key?provider=${provider}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError("Failed to remove key");
        return;
      }

      onKeyRemoved();
    } catch {
      setError("Failed to remove key");
    } finally {
      setRemoving(null);
    }
  };

  // Show all known providers, marking unconfigured ones
  const allProviders = ["anthropic", "openai"];
  const providerMap = new Map(configuredProviders.map((p) => [p.provider, p]));

  const displayProviders = allProviders.map((providerName) => {
    const config = providerMap.get(providerName);
    return {
      provider: providerName,
      keyPresent: config?.keyPresent ?? false,
      keyMasked: config?.keyMasked ?? null,
    };
  });

  const hasAnyKey = configuredProviders.some((p) => p.keyPresent);

  if (!hasAnyKey && configuredProviders.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Configured API Keys</h3>
        </div>
        <p className="text-sm text-muted-foreground">No API keys configured. Add a key above to enable AI features.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Key className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Configured API Keys</h3>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {displayProviders.map(({ provider, keyPresent, keyMasked }) => (
          <div
            key={provider}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div className="flex items-center gap-3">
              {keyPresent ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <span className="font-medium">{provider}</span>
                {keyPresent && keyMasked ? (
                  <code className="ml-3 rounded bg-muted px-2 py-0.5 text-sm">
                    {keyMasked}
                  </code>
                ) : (
                  <span className="ml-3 text-sm text-muted-foreground">Not configured</span>
                )}
              </div>
            </div>

            {keyPresent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(provider)}
                disabled={removing === provider}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                {removing === provider ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </>
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
