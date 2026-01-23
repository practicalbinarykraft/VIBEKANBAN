/**
 * Overlay Visibility Rules (PR-111)
 *
 * Determines when floating panels should render as overlays.
 * Planning/Chat tabs should NOT have overlays that intercept clicks.
 */

export type TabType = "tasks" | "chat" | "planning";

export interface OverlayVisibilityInput {
  activeTab: TabType;
  hasSession?: boolean;
}

/**
 * Determines if the runs panel overlay should be rendered.
 *
 * Rule: Only show overlay on "tasks" tab to avoid click interception
 * on Planning/Chat where critical CTAs exist (generate-plan, iterate, etc.)
 */
export function shouldRenderRunsPanelOverlay(input: OverlayVisibilityInput): boolean {
  // Never show overlay on planning or chat tabs - they have critical CTAs
  if (input.activeTab === "planning" || input.activeTab === "chat") {
    return false;
  }

  // Show on tasks tab
  return input.activeTab === "tasks";
}

/**
 * Determines the placement type for the runs panel.
 *
 * Returns:
 * - "overlay": Fixed position overlay (only on tasks tab)
 * - "hidden": Don't render (on planning/chat tabs)
 */
export function getRunsPanelPlacement(input: OverlayVisibilityInput): "overlay" | "hidden" {
  if (shouldRenderRunsPanelOverlay(input)) {
    return "overlay";
  }
  return "hidden";
}
