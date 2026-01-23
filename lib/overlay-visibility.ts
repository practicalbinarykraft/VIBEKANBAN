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
 * Rule: Disable floating overlay on ALL tabs to prevent click interception.
 * The overlay was blocking task cards, generate buttons, and other CTAs.
 * Run history is accessible via other UI patterns.
 */
export function shouldRenderRunsPanelOverlay(input: OverlayVisibilityInput): boolean {
  // Disable overlay on all tabs - it intercepts clicks on important elements
  return false;
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
