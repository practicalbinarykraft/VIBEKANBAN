import { describe, it, expect } from "vitest";
import { shouldShowAutopilotPanel } from "../autopilot-panel-visibility";

describe("shouldShowAutopilotPanel", () => {
  it("returns false when enableAutopilotV2 is false", () => {
    expect(
      shouldShowAutopilotPanel({
        enableAutopilotV2: false,
        activeTab: "tasks",
      })
    ).toBe(false);
  });

  it("returns false when activeTab is planning", () => {
    expect(
      shouldShowAutopilotPanel({
        enableAutopilotV2: true,
        activeTab: "planning",
      })
    ).toBe(false);
  });

  it("returns true when enableAutopilotV2 is true and activeTab is tasks", () => {
    expect(
      shouldShowAutopilotPanel({
        enableAutopilotV2: true,
        activeTab: "tasks",
      })
    ).toBe(true);
  });

  it("returns false when activeTab is chat", () => {
    expect(
      shouldShowAutopilotPanel({
        enableAutopilotV2: true,
        activeTab: "chat",
      })
    ).toBe(false);
  });
});
