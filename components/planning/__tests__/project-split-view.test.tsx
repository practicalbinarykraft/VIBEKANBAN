/**
 * ProjectSplitView Tests (PR-126)
 *
 * Tests for the new split-view planning layout.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectSplitView } from "../project-split-view";

// Mock child components to isolate layout testing
vi.mock("@/components/chat/project-chat", () => ({
  ProjectChat: ({ projectId }: { projectId: string }) => (
    <div data-testid="project-chat">ProjectChat: {projectId}</div>
  ),
}));

vi.mock("../planning-tab", () => ({
  PlanningTab: ({ projectId, compactMode }: { projectId: string; compactMode?: boolean }) => (
    <div data-testid="planning-tab" data-compact={compactMode}>
      PlanningTab: {projectId} {compactMode ? "(compact)" : "(full)"}
    </div>
  ),
}));

describe("ProjectSplitView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders split-view container", () => {
    render(<ProjectSplitView projectId="test-123" />);
    expect(screen.getByTestId("project-split-view")).toBeInTheDocument();
  });

  it("renders ProjectChat in left panel", () => {
    render(<ProjectSplitView projectId="test-123" />);
    expect(screen.getByTestId("project-chat")).toBeInTheDocument();
    expect(screen.getByText(/ProjectChat: test-123/)).toBeInTheDocument();
  });

  it("renders PlanningTab in right panel with compactMode", () => {
    render(<ProjectSplitView projectId="test-123" />);
    const planningTab = screen.getByTestId("planning-tab");
    expect(planningTab).toBeInTheDocument();
    expect(planningTab).toHaveAttribute("data-compact", "true");
  });

  it("passes projectId to both child components", () => {
    render(<ProjectSplitView projectId="project-abc" />);
    expect(screen.getByText(/ProjectChat: project-abc/)).toBeInTheDocument();
    expect(screen.getByText(/PlanningTab: project-abc/)).toBeInTheDocument();
  });

  it("has two-column layout structure", () => {
    render(<ProjectSplitView projectId="test-123" />);
    const leftPanel = screen.getByTestId("split-left-panel");
    const rightPanel = screen.getByTestId("split-right-panel");
    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();
  });
});
