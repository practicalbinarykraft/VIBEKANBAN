/** useFactoryStream Tests (PR-84) */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFactoryStream } from "../useFactoryStream";

class MockEventSource {
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  readyState = 0;
  close = vi.fn();
  static instances: MockEventSource[] = [];
  constructor(public url: string) { MockEventSource.instances.push(this); }
  simulateOpen() { this.readyState = 1; this.onopen?.(); }
  simulateMessage(data: object) { this.onmessage?.({ data: JSON.stringify(data) }); }
  simulateError() { this.onerror?.(); }
}

describe("useFactoryStream", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("sets isConnected true on open", async () => {
    const { result } = renderHook(() => useFactoryStream("p1"));
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    act(() => MockEventSource.instances[0].simulateOpen());
    expect(result.current.isConnected).toBe(true);
  });

  it("updates attempts map on attempt event", async () => {
    const { result } = renderHook(() => useFactoryStream("p1"));
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    act(() => {
      MockEventSource.instances[0].simulateOpen();
      MockEventSource.instances[0].simulateMessage({
        type: "attempt", attemptId: "a1", taskId: "t1", status: "running",
      });
    });
    expect(result.current.attempts.get("a1")).toMatchObject({
      taskId: "t1", status: "running",
    });
  });

  it("updates log line on log event", async () => {
    const { result } = renderHook(() => useFactoryStream("p1"));
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    act(() => {
      MockEventSource.instances[0].simulateOpen();
      MockEventSource.instances[0].simulateMessage({
        type: "attempt", attemptId: "a1", taskId: "t1", status: "running",
      });
      MockEventSource.instances[0].simulateMessage({
        type: "log", attemptId: "a1", line: "Processing...",
      });
    });
    expect(result.current.attempts.get("a1")?.lastLogLine).toBe("Processing...");
  });

  it("updates run status on run event", async () => {
    const { result } = renderHook(() => useFactoryStream("p1"));
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    act(() => {
      MockEventSource.instances[0].simulateOpen();
      MockEventSource.instances[0].simulateMessage({
        type: "run", runId: "r1", status: "completed",
      });
    });
    expect(result.current.runStatus).toBe("completed");
  });

  it("sets isConnected false on error", async () => {
    const { result } = renderHook(() => useFactoryStream("p1"));
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    act(() => {
      MockEventSource.instances[0].simulateOpen();
    });
    expect(result.current.isConnected).toBe(true);
    act(() => {
      MockEventSource.instances[0].simulateError();
    });
    expect(result.current.isConnected).toBe(false);
  });

  it("closes connection on unmount", () => {
    const { unmount } = renderHook(() => useFactoryStream("p1"));
    expect(MockEventSource.instances.length).toBe(1);
    unmount();
    expect(MockEventSource.instances[0].close).toHaveBeenCalled();
  });
});
