/**
 * Unit tests for AI Cost Events service
 *
 * Tests:
 * - estimateAnthropicCostUsd returns cost for known models
 * - estimateAnthropicCostUsd returns null for unknown models
 * - recordAiCostEvent writes event to database
 * - recordAiCostEvent handles null fields correctly
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { db, initDB } from "@/server/db";
import { aiCostEvents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  estimateAnthropicCostUsd,
  recordAiCostEvent,
  ANTHROPIC_PRICING,
} from "../ai/ai-cost-events";

describe("ai-cost-events", () => {
  beforeAll(() => {
    initDB();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(aiCostEvents).where(eq(aiCostEvents.source, "test"));
  });

  describe("estimateAnthropicCostUsd", () => {
    it("returns cost for claude-sonnet-4-20250514", () => {
      const cost = estimateAnthropicCostUsd({
        model: "claude-sonnet-4-20250514",
        promptTokens: 1000,
        completionTokens: 500,
      });

      expect(cost).not.toBeNull();
      expect(typeof cost).toBe("number");
      expect(cost).toBeGreaterThan(0);

      // Verify calculation: (1000/1M * promptPrice) + (500/1M * completionPrice)
      const pricing = ANTHROPIC_PRICING["claude-sonnet-4-20250514"];
      const expectedCost =
        (1000 / 1_000_000) * pricing.promptPricePerMillion +
        (500 / 1_000_000) * pricing.completionPricePerMillion;
      expect(cost).toBeCloseTo(expectedCost, 10);
    });

    it("returns null for unknown model", () => {
      const cost = estimateAnthropicCostUsd({
        model: "unknown-model-xyz",
        promptTokens: 1000,
        completionTokens: 500,
      });

      expect(cost).toBeNull();
    });

    it("returns 0 for zero tokens", () => {
      const cost = estimateAnthropicCostUsd({
        model: "claude-sonnet-4-20250514",
        promptTokens: 0,
        completionTokens: 0,
      });

      expect(cost).toBe(0);
    });

    it("handles null tokens gracefully", () => {
      const cost = estimateAnthropicCostUsd({
        model: "claude-sonnet-4-20250514",
        promptTokens: null as unknown as number,
        completionTokens: null as unknown as number,
      });

      expect(cost).toBe(0);
    });
  });

  describe("recordAiCostEvent", () => {
    it("writes event to database with all fields", async () => {
      const eventId = `test-event-${Date.now()}`;

      await recordAiCostEvent({
        id: eventId,
        projectId: "test-project",
        threadId: "test-thread",
        source: "test",
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        estimatedCostUsd: 0.001,
        metadata: { test: true },
      });

      const event = await db
        .select()
        .from(aiCostEvents)
        .where(eq(aiCostEvents.id, eventId))
        .get();

      expect(event).not.toBeNull();
      expect(event?.projectId).toBe("test-project");
      expect(event?.threadId).toBe("test-thread");
      expect(event?.source).toBe("test");
      expect(event?.provider).toBe("anthropic");
      expect(event?.model).toBe("claude-sonnet-4-20250514");
      expect(event?.promptTokens).toBe(100);
      expect(event?.completionTokens).toBe(50);
      expect(event?.totalTokens).toBe(150);
      expect(event?.estimatedCostUsd).toBeCloseTo(0.001, 6);
    });

    it("writes metadataJson as JSON string", async () => {
      const eventId = `test-meta-${Date.now()}`;

      await recordAiCostEvent({
        id: eventId,
        source: "test",
        provider: "mock",
        metadata: { error: "test error", stage: "provider_call" },
      });

      const event = await db
        .select()
        .from(aiCostEvents)
        .where(eq(aiCostEvents.id, eventId))
        .get();

      expect(event?.metadataJson).not.toBeNull();
      const parsed = JSON.parse(event?.metadataJson || "{}");
      expect(parsed.error).toBe("test error");
      expect(parsed.stage).toBe("provider_call");
    });

    it("handles null fields correctly", async () => {
      const eventId = `test-null-${Date.now()}`;

      await recordAiCostEvent({
        id: eventId,
        source: "test",
        provider: "anthropic",
        projectId: null,
        threadId: null,
        model: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        estimatedCostUsd: null,
        metadata: null,
      });

      const event = await db
        .select()
        .from(aiCostEvents)
        .where(eq(aiCostEvents.id, eventId))
        .get();

      expect(event).not.toBeNull();
      expect(event?.projectId).toBeNull();
      expect(event?.threadId).toBeNull();
      expect(event?.model).toBeNull();
      expect(event?.promptTokens).toBeNull();
      expect(event?.metadataJson).toBeNull();
    });

    it("generates id if not provided", async () => {
      await recordAiCostEvent({
        source: "test",
        provider: "mock",
      });

      const events = await db
        .select()
        .from(aiCostEvents)
        .where(eq(aiCostEvents.source, "test"))
        .all();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].id).toBeTruthy();
      expect(events[0].id.length).toBeGreaterThan(0);
    });
  });
});
