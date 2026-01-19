"use client";

import { useState, useEffect } from "react";
import { Bot, Check, Loader2, AlertTriangle } from "lucide-react";
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
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
  model: string;
}

const ANTHROPIC_MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
];

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
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
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-20250514");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setProvider(data.provider || "demo");
        setModel(data.model || "claude-sonnet-4-20250514");
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      // Validate: if provider is not demo, key must be provided (or already set)
      if (provider === "anthropic" && !anthropicKey && !settings?.hasAnthropicKey) {
        throw new Error("Anthropic API key is required");
      }
      if (provider === "openai" && !openaiKey && !settings?.hasOpenaiKey) {
        throw new Error("OpenAI API key is required");
      }

      const body: Record<string, string | undefined> = {
        provider,
        model,
      };

      // Only send key if user entered a new one
      if (anthropicKey) {
        body.anthropicApiKey = anthropicKey;
      }
      if (openaiKey) {
        body.openaiApiKey = openaiKey;
      }

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      // Clear key inputs after successful save
      setAnthropicKey("");
      setOpenaiKey("");
      setSuccess(true);

      // Refresh settings
      await fetchSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    const isDemoLoading =
      process.env.NEXT_PUBLIC_VIBE_DEMO_MODE === "1" ||
      process.env.NEXT_PUBLIC_PLAYWRIGHT === "1";

    return (
      <div className="rounded-lg border bg-card p-6" data-testid="ai-mode-section">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading settings...</span>
          {isDemoLoading && <span className="text-xs text-muted-foreground">(Demo)</span>}
        </div>
      </div>
    );
  }

  const isDemoMode =
    process.env.NEXT_PUBLIC_VIBE_DEMO_MODE === "1" ||
    process.env.NEXT_PUBLIC_PLAYWRIGHT === "1";
  const currentModels = provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
  const isRealMode = provider !== "demo" && (
    (provider === "anthropic" && (settings?.hasAnthropicKey || anthropicKey)) ||
    (provider === "openai" && (settings?.hasOpenaiKey || openaiKey))
  );

  return (
    <div className="rounded-lg border bg-card p-6" data-testid="ai-mode-section">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Bot className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">AI Provider Configuration</h2>
          <p className="text-sm text-muted-foreground">Configure your AI provider and API keys</p>
        </div>
        <Badge
          variant={isRealMode ? "default" : "secondary"}
          className="ml-auto"
        >
          {isDemoMode ? "Demo Mode" : isRealMode ? "Real Mode" : "Not Configured"}
        </Badge>
      </div>

      {isDemoMode && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Demo mode is enabled (VIBE_DEMO_MODE=1). AI responses are simulated.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">AI Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">Demo (Mock Responses)</SelectItem>
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="openai">OpenAI (GPT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* API Key Input */}
        {provider === "anthropic" && (
          <div className="space-y-2">
            <Label htmlFor="anthropic-key">
              Anthropic API Key
              {settings?.hasAnthropicKey && (
                <span className="ml-2 text-xs text-green-600">(configured)</span>
              )}
            </Label>
            <Input
              id="anthropic-key"
              type="password"
              placeholder={settings?.hasAnthropicKey ? "Enter new key to update..." : "sk-ant-..."}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>
        )}

        {provider === "openai" && (
          <div className="space-y-2">
            <Label htmlFor="openai-key">
              OpenAI API Key
              {settings?.hasOpenaiKey && (
                <span className="ml-2 text-xs text-green-600">(configured)</span>
              )}
            </Label>
            <Input
              id="openai-key"
              type="password"
              placeholder={settings?.hasOpenaiKey ? "Enter new key to update..." : "sk-..."}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                platform.openai.com
              </a>
            </p>
          </div>
        )}

        {/* Model Selection */}
        {provider !== "demo" && (
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
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Settings saved successfully!{" "}
              {isRealMode && "Real AI mode is now enabled."}
            </p>
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
    </div>
  );
}
