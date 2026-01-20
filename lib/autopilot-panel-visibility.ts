/**
 * Determine if autopilot panels should be visible.
 * Panels are only shown on the Tasks tab to avoid blocking form elements on other tabs.
 */
export function shouldShowAutopilotPanel(options: {
  enableAutopilotV2: boolean;
  activeTab: string;
}): boolean {
  return options.enableAutopilotV2 && options.activeTab === "tasks";
}
