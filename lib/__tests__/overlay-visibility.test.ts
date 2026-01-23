/**
 * Overlay Visibility Tests (PR-111)
 *
 * Tests for overlay visibility rules to prevent click interception.
 */
import { describe, it, expect } from "vitest";
import {
  shouldRenderRunsPanelOverlay,
  getRunsPanelPlacement,
} from "../overlay-visibility";

describe("shouldRenderRunsPanelOverlay", () => {
  describe("planning tab", () => {
    it("returns false - no overlay on planning tab", () => {
      expect(shouldRenderRunsPanelOverlay({ activeTab: "planning" })).toBe(false);
    });

    it("returns false even with session", () => {
      expect(
        shouldRenderRunsPanelOverlay({ activeTab: "planning", hasSession: true })
      ).toBe(false);
    });
  });

  describe("chat tab", () => {
    it("returns false - no overlay on chat tab", () => {
      expect(shouldRenderRunsPanelOverlay({ activeTab: "chat" })).toBe(false);
    });

    it("returns false even with session", () => {
      expect(
        shouldRenderRunsPanelOverlay({ activeTab: "chat", hasSession: true })
      ).toBe(false);
    });
  });

  describe("tasks tab", () => {
    it("returns false - overlay disabled on tasks tab to prevent click interception", () => {
      expect(shouldRenderRunsPanelOverlay({ activeTab: "tasks" })).toBe(false);
    });

    it("returns false even with session", () => {
      expect(
        shouldRenderRunsPanelOverlay({ activeTab: "tasks", hasSession: true })
      ).toBe(false);
    });
  });
});

describe("getRunsPanelPlacement", () => {
  it("returns 'hidden' for planning tab", () => {
    expect(getRunsPanelPlacement({ activeTab: "planning" })).toBe("hidden");
  });

  it("returns 'hidden' for chat tab", () => {
    expect(getRunsPanelPlacement({ activeTab: "chat" })).toBe("hidden");
  });

  it("returns 'hidden' for tasks tab - overlay disabled", () => {
    expect(getRunsPanelPlacement({ activeTab: "tasks" })).toBe("hidden");
  });
});
