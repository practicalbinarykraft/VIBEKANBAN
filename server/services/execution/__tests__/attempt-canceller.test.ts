/**
 * Attempt Canceller Tests (PR-72)
 * TDD: Tests written before implementation
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  cancelAttempt,
  type CancelAttemptResult,
  type CancellerDeps,
} from "../attempt-canceller";
import type { RuntimeHandle } from "../attempt-runtime-registry";

describe("cancelAttempt", () => {
  let mockGetAttempt: Mock;
  let mockUpdateAttemptStatus: Mock;
  let mockAddLog: Mock;
  let mockGetRuntime: Mock;
  let mockUnregisterRuntime: Mock;
  let deps: CancellerDeps;

  beforeEach(() => {
    mockGetAttempt = vi.fn();
    mockUpdateAttemptStatus = vi.fn().mockResolvedValue(undefined);
    mockAddLog = vi.fn().mockResolvedValue(undefined);
    mockGetRuntime = vi.fn();
    mockUnregisterRuntime = vi.fn();
    deps = {
      getAttempt: mockGetAttempt,
      updateAttemptStatus: mockUpdateAttemptStatus,
      addLog: mockAddLog,
      getRuntime: mockGetRuntime,
      unregisterRuntime: mockUnregisterRuntime,
    };
  });

  it("returns NOT_FOUND when attempt does not exist", async () => {
    mockGetAttempt.mockResolvedValueOnce(null);

    const result = await cancelAttempt("non-existent", deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_FOUND");
    }
  });

  it("returns ALREADY_FINISHED for completed attempt", async () => {
    mockGetAttempt.mockResolvedValueOnce({ id: "a1", status: "completed" });

    const result = await cancelAttempt("a1", deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ALREADY_FINISHED");
    }
    expect(mockUpdateAttemptStatus).not.toHaveBeenCalled();
  });

  it("returns ALREADY_FINISHED for failed attempt", async () => {
    mockGetAttempt.mockResolvedValueOnce({ id: "a2", status: "failed" });

    const result = await cancelAttempt("a2", deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ALREADY_FINISHED");
    }
  });

  it("returns ALREADY_FINISHED for stopped attempt", async () => {
    mockGetAttempt.mockResolvedValueOnce({ id: "a3", status: "stopped" });

    const result = await cancelAttempt("a3", deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ALREADY_FINISHED");
    }
  });

  it("soft-cancels queued attempt without calling stop", async () => {
    mockGetAttempt.mockResolvedValueOnce({ id: "a4", status: "queued" });

    const result = await cancelAttempt("a4", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("stopped");
      expect(result.attemptId).toBe("a4");
    }
    expect(mockUpdateAttemptStatus).toHaveBeenCalledWith("a4", "stopped");
    expect(mockAddLog).toHaveBeenCalledWith("a4", expect.stringContaining("before"));
    expect(mockGetRuntime).not.toHaveBeenCalled();
  });

  it("soft-cancels pending attempt without calling stop", async () => {
    mockGetAttempt.mockResolvedValueOnce({ id: "a5", status: "pending" });

    const result = await cancelAttempt("a5", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("stopped");
    }
    expect(mockUpdateAttemptStatus).toHaveBeenCalledWith("a5", "stopped");
    expect(mockAddLog).toHaveBeenCalled();
  });

  it("cancels running attempt with handle - calls stop and unregister", async () => {
    const mockStop = vi.fn().mockResolvedValue(undefined);
    const handle: RuntimeHandle = { kind: "local", stop: mockStop };
    mockGetAttempt.mockResolvedValueOnce({ id: "a6", status: "running" });
    mockGetRuntime.mockReturnValueOnce(handle);

    const result = await cancelAttempt("a6", deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("stopped");
      expect(result.attemptId).toBe("a6");
    }
    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(mockUpdateAttemptStatus).toHaveBeenCalledWith("a6", "stopped");
    expect(mockUnregisterRuntime).toHaveBeenCalledWith("a6");
    expect(mockAddLog).toHaveBeenCalledWith("a6", expect.stringContaining("Cancelled"));
  });

  it("returns CANCEL_FAILED for running attempt without handle", async () => {
    mockGetAttempt.mockResolvedValueOnce({ id: "a7", status: "running" });
    mockGetRuntime.mockReturnValueOnce(null);

    const result = await cancelAttempt("a7", deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("CANCEL_FAILED");
      expect(result.message).toContain("handle not found");
    }
    expect(mockUpdateAttemptStatus).not.toHaveBeenCalled();
  });

  it("returns CANCEL_FAILED when stop() throws", async () => {
    const mockStop = vi.fn().mockRejectedValue(new Error("Kill failed"));
    const handle: RuntimeHandle = { kind: "local", stop: mockStop };
    mockGetAttempt.mockResolvedValueOnce({ id: "a8", status: "running" });
    mockGetRuntime.mockReturnValueOnce(handle);

    const result = await cancelAttempt("a8", deps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("CANCEL_FAILED");
      expect(result.message).toContain("Kill failed");
    }
    expect(mockUnregisterRuntime).toHaveBeenCalledWith("a8");
    expect(mockUpdateAttemptStatus).not.toHaveBeenCalled();
  });
});
