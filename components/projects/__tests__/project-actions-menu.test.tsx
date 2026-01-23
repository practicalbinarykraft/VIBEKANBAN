/** Project Actions Menu Tests (PR-110) */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectActionsMenu } from "../project-actions-menu";
import type { Project } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

const mockProject: Project = {
  id: "proj-1",
  name: "Test Project",
  gitUrl: "https://github.com/test/repo",
  defaultBranch: "main",
  createdAt: new Date(),
};

describe("ProjectActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders trigger button", () => {
    render(<ProjectActionsMenu project={mockProject} />);
    expect(screen.getByTestId("project-actions-trigger")).toBeInTheDocument();
  });

  it("opens menu on click", async () => {
    const user = userEvent.setup();
    render(<ProjectActionsMenu project={mockProject} />);
    await user.click(screen.getByTestId("project-actions-trigger"));
    expect(screen.getByTestId("project-actions-menu")).toBeInTheDocument();
  });

  it("shows Edit project option", async () => {
    const user = userEvent.setup();
    render(<ProjectActionsMenu project={mockProject} />);
    await user.click(screen.getByTestId("project-actions-trigger"));
    expect(screen.getByTestId("action-edit")).toBeInTheDocument();
  });

  it("shows Open repository option", async () => {
    const user = userEvent.setup();
    render(<ProjectActionsMenu project={mockProject} />);
    await user.click(screen.getByTestId("project-actions-trigger"));
    expect(screen.getByTestId("action-open-repo")).toBeInTheDocument();
  });

  it("shows Factory history option", async () => {
    const user = userEvent.setup();
    render(<ProjectActionsMenu project={mockProject} />);
    await user.click(screen.getByTestId("project-actions-trigger"));
    expect(screen.getByTestId("action-factory-history")).toBeInTheDocument();
  });

  it("shows Clone project option", async () => {
    const user = userEvent.setup();
    render(<ProjectActionsMenu project={mockProject} />);
    await user.click(screen.getByTestId("project-actions-trigger"));
    expect(screen.getByTestId("action-clone")).toBeInTheDocument();
  });

  it("shows Reset factory state option", async () => {
    const user = userEvent.setup();
    render(<ProjectActionsMenu project={mockProject} />);
    await user.click(screen.getByTestId("project-actions-trigger"));
    expect(screen.getByTestId("action-reset")).toBeInTheDocument();
  });

  it("shows Delete project option with destructive styling", async () => {
    const user = userEvent.setup();
    render(<ProjectActionsMenu project={mockProject} />);
    await user.click(screen.getByTestId("project-actions-trigger"));
    const deleteItem = screen.getByTestId("action-delete");
    expect(deleteItem).toBeInTheDocument();
    expect(deleteItem).toHaveClass("text-destructive");
  });

  describe("Restart last run visibility", () => {
    it("does NOT show Restart when no lastRun", async () => {
      const user = userEvent.setup();
      render(<ProjectActionsMenu project={mockProject} lastRun={null} />);
      await user.click(screen.getByTestId("project-actions-trigger"));
      expect(screen.getByTestId("project-actions-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("action-restart")).not.toBeInTheDocument();
    });

    it("does NOT show Restart when lastRun is running", async () => {
      const user = userEvent.setup();
      render(
        <ProjectActionsMenu
          project={mockProject}
          lastRun={{ id: "run-1", status: "running", maxParallel: 3 }}
        />
      );
      await user.click(screen.getByTestId("project-actions-trigger"));
      expect(screen.getByTestId("project-actions-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("action-restart")).not.toBeInTheDocument();
    });

    it("shows Restart when lastRun is failed", async () => {
      const user = userEvent.setup();
      render(
        <ProjectActionsMenu
          project={mockProject}
          lastRun={{ id: "run-1", status: "failed", maxParallel: 3 }}
        />
      );
      await user.click(screen.getByTestId("project-actions-trigger"));
      expect(screen.getByTestId("action-restart")).toBeInTheDocument();
    });

    it("shows Restart when lastRun is completed", async () => {
      const user = userEvent.setup();
      render(
        <ProjectActionsMenu
          project={mockProject}
          lastRun={{ id: "run-1", status: "completed", maxParallel: 3 }}
        />
      );
      await user.click(screen.getByTestId("project-actions-trigger"));
      expect(screen.getByTestId("action-restart")).toBeInTheDocument();
    });

    it("shows Restart when lastRun is cancelled", async () => {
      const user = userEvent.setup();
      render(
        <ProjectActionsMenu
          project={mockProject}
          lastRun={{ id: "run-1", status: "cancelled", maxParallel: 3 }}
        />
      );
      await user.click(screen.getByTestId("project-actions-trigger"));
      expect(screen.getByTestId("action-restart")).toBeInTheDocument();
    });
  });

  describe("Delete project flow", () => {
    it("calls API and redirects on success", async () => {
      const user = userEvent.setup();
      const mockPush = vi.fn();
      const mockOnDeleted = vi.fn();

      vi.mocked(await import("next/navigation")).useRouter.mockReturnValue({
        push: mockPush,
        refresh: vi.fn(),
      } as any);

      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      render(
        <ProjectActionsMenu
          project={mockProject}
          onProjectDeleted={mockOnDeleted}
        />
      );

      // Open menu and click delete
      await user.click(screen.getByTestId("project-actions-trigger"));
      await user.click(screen.getByTestId("action-delete"));

      // Dialog should open
      expect(screen.getByTestId("delete-project-dialog")).toBeInTheDocument();

      // Type project name to confirm
      await user.type(screen.getByTestId("delete-confirm-input"), mockProject.name);
      await user.click(screen.getByTestId("delete-confirm-button"));

      // Verify API was called
      expect(fetch).toHaveBeenCalledWith(
        `/api/projects/${mockProject.id}`,
        { method: "DELETE" }
      );

      // Verify callback and redirect on success
      expect(mockOnDeleted).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/projects");
    });

    it("does NOT redirect on API failure", async () => {
      const user = userEvent.setup();
      const mockPush = vi.fn();
      const mockOnDeleted = vi.fn();
      const mockOnError = vi.fn();

      vi.mocked(await import("next/navigation")).useRouter.mockReturnValue({
        push: mockPush,
        refresh: vi.fn(),
      } as any);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" })
      });

      render(
        <ProjectActionsMenu
          project={mockProject}
          onProjectDeleted={mockOnDeleted}
          onDeleteError={mockOnError}
        />
      );

      // Open menu and click delete
      await user.click(screen.getByTestId("project-actions-trigger"));
      await user.click(screen.getByTestId("action-delete"));

      // Type project name and confirm
      await user.type(screen.getByTestId("delete-confirm-input"), mockProject.name);
      await user.click(screen.getByTestId("delete-confirm-button"));

      // Verify API was called
      expect(fetch).toHaveBeenCalled();

      // Should NOT redirect or call success callback on failure
      expect(mockOnDeleted).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalledWith("/projects");

      // Should call error callback
      expect(mockOnError).toHaveBeenCalled();
    });
  });
});
