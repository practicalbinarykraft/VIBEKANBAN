/**
 * AI Cost Events Service
 *
 * Records AI usage events with token counts and estimated costs.
 * Used for billing, cost tracking, and debugging.
 */

import { db } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { randomUUID } from "crypto";

export type AiEventSource = "council" | "plan" | "autopilot" | "other";
export type AiEventProvider = "anthropic" | "openai" | "mock" | "db";

/**
 * Pricing table for Anthropic models (USD per 1M tokens)
 * Source: https://www.anthropic.com/pricing
 */
export const ANTHROPIC_PRICING: Record<
  string,
  { promptPricePerMillion: number; completionPricePerMillion: number }
> = {
  "claude-sonnet-4-20250514": {
    promptPricePerMillion: 3.0,
    completionPricePerMillion: 15.0,
  },
  "claude-opus-4-20250514": {
    promptPricePerMillion: 15.0,
    completionPricePerMillion: 75.0,
  },
  "claude-3-5-sonnet-20241022": {
    promptPricePerMillion: 3.0,
    completionPricePerMillion: 15.0,
  },
};

export interface EstimateCostParams {
  model: string;
  promptTokens: number | null | undefined;
  completionTokens: number | null | undefined;
}

/**
 * Estimate cost in USD for Anthropic API call
 * Returns null if model is unknown
 */
export function estimateAnthropicCostUsd(params: EstimateCostParams): number | null {
  const pricing = ANTHROPIC_PRICING[params.model];
  if (!pricing) {
    return null;
  }

  const promptTokens = params.promptTokens || 0;
  const completionTokens = params.completionTokens || 0;

  const promptCost = (promptTokens / 1_000_000) * pricing.promptPricePerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.completionPricePerMillion;

  return promptCost + completionCost;
}

export interface RecordAiCostEventInput {
  id?: string;
  projectId?: string | null;
  threadId?: string | null;
  source: AiEventSource | string;
  provider: AiEventProvider | string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  estimatedCostUsd?: number | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Record an AI cost event to the database
 * Called after each AI API call (success or failure)
 */
export async function recordAiCostEvent(input: RecordAiCostEventInput): Promise<void> {
  const id = input.id || randomUUID();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  await db.insert(aiCostEvents).values({
    id,
    projectId: input.projectId ?? null,
    threadId: input.threadId ?? null,
    source: input.source,
    provider: input.provider,
    model: input.model ?? null,
    promptTokens: input.promptTokens ?? null,
    completionTokens: input.completionTokens ?? null,
    totalTokens: input.totalTokens ?? null,
    estimatedCostUsd: input.estimatedCostUsd ?? null,
    metadataJson,
  });
}

/**
 * Helper to record AI event from completion result
 * Calculates cost automatically for Anthropic models
 */
export function createCostEventFromCompletion(params: {
  provider: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
  source?: AiEventSource;
  projectId?: string;
  threadId?: string;
  error?: string;
}): RecordAiCostEventInput {
  const promptTokens = params.usage?.inputTokens ?? null;
  const completionTokens = params.usage?.outputTokens ?? null;
  const totalTokens =
    promptTokens !== null && completionTokens !== null
      ? promptTokens + completionTokens
      : null;

  let estimatedCostUsd: number | null = null;
  if (params.provider === "anthropic" && promptTokens !== null && completionTokens !== null) {
    estimatedCostUsd = estimateAnthropicCostUsd({
      model: params.model,
      promptTokens,
      completionTokens,
    });
  }

  const metadata: Record<string, unknown> | null = params.error
    ? { error: params.error, stage: "provider_call" }
    : null;

  return {
    projectId: params.projectId,
    threadId: params.threadId,
    source: params.source || "other",
    provider: params.provider as AiEventProvider,
    model: params.model,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
    metadata,
  };
}
