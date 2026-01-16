"use client";

import { useState, useEffect } from "react";
import { Bot, Check, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsData {
  provider: "demo" | "anthropic" | "openai";
  anthropicApiKey: string | null;
  openaiApiKey: string | null;
  model: string | null;
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
}

const PROVIDERS = [
  { value: "demo", label: "Demo Mode (Mock AI)" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "openai", label: "OpenAI GPT" },
] as const;

const ANTHROPIC_MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku (Fast)" },
];

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

export function AiModeSection() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [provider, setProvider] = useState<"demo" | "anthropic" | "openai">("demo");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-20250514");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data: SettingsData = await res.json();
        setSettings(data);
        setProvider(data.provider);
        setModel(data.model || "claude-sonnet-4-20250514");
        // Don't populate apiKey - it comes back masked
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const body: Record<string, string | undefined> = {
        provider,
        model,
      };

      // Only send API key if user entered a new one
      if (apiKey) {
        if (provider === "anthropic") {
          body.anthropicApiKey = apiKey;
        } else if (provider === "openai") {
          body.openaiApiKey = apiKey;
        }
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess(true);
      setApiKey(""); // Clear after saving
      fetchSettings(); // Refresh to get updated state

      // Clear success message after 3s
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const currentModels = provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
  const showKeyInput = provider !== "demo";
  const hasCurrentKey = provider === "anthropic" ? settings?.hasAnthropicKey : settings?.hasOpenaiKey;

  return (
    <div className="rounded-lg border bg-card p-6" data-testid="ai-mode-section">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Bot className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">AI Provider Settings</h2>
          <p className="text-sm text-muted-foreground">Configure your AI provider and API key</p>
        </div>
        <Badge
          variant={provider === "demo" ? "secondary" : "default"}
          className="ml-auto"
        >
          {provider === "demo" ? "Demo" : "Real AI"}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">AI Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key Input */}
        {showKeyInput && (
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key
              {hasCurrentKey && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                  (Key configured)
                </span>
              )}
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={hasCurrentKey ? "Enter new key to replace" : "Enter your API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {provider === "anthropic"
                ? "Get your key from console.anthropic.com"
                : "Get your key from platform.openai.com"}
            </p>
          </div>
        )}

        {/* Model Selection */}
        {showKeyInput && (
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {currentModels.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            <Check className="h-4 w-4" />
            Settings saved successfully!
          </div>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>

      {/* Demo Mode Info */}
      {provider === "demo" && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Demo mode uses mock AI responses. Select a real provider and add your API key to enable real AI features.
          </p>
        </div>
      )}
    </div>
  );
}
