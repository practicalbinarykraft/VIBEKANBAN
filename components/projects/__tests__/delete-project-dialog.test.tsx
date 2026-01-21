/** Delete Project Dialog Tests (PR-110) */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteProjectDialog } from "../delete-project-dialog";

describe("DeleteProjectDialog", () => {
  const defaultProps = {
    open: true,
    projectName: "Test Project",
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open", () => {
    render(<DeleteProjectDialog {...defaultProps} />);
    expect(screen.getByTestId("delete-project-dialog")).toBeInTheDocument();
  });

  it("shows project name in description", () => {
    render(<DeleteProjectDialog {...defaultProps} />);
    expect(screen.getAllByText(/Test Project/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows confirmation input", () => {
    render(<DeleteProjectDialog {...defaultProps} />);
    expect(screen.getByTestId("delete-confirm-input")).toBeInTheDocument();
  });

  it("disables delete button when name not typed", () => {
    render(<DeleteProjectDialog {...defaultProps} />);
    expect(screen.getByTestId("delete-confirm-button")).toBeDisabled();
  });

  it("enables delete button when correct name typed", () => {
    render(<DeleteProjectDialog {...defaultProps} />);
    const input = screen.getByTestId("delete-confirm-input");
    fireEvent.change(input, { target: { value: "Test Project" } });
    expect(screen.getByTestId("delete-confirm-button")).not.toBeDisabled();
  });

  it("keeps delete button disabled when wrong name typed", () => {
    render(<DeleteProjectDialog {...defaultProps} />);
    const input = screen.getByTestId("delete-confirm-input");
    fireEvent.change(input, { target: { value: "Wrong Name" } });
    expect(screen.getByTestId("delete-confirm-button")).toBeDisabled();
  });

  it("calls onConfirm when delete clicked with correct name", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<DeleteProjectDialog {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByTestId("delete-confirm-input");
    fireEvent.change(input, { target: { value: "Test Project" } });
    fireEvent.click(screen.getByTestId("delete-confirm-button"));

    expect(onConfirm).toHaveBeenCalled();
  });
});
