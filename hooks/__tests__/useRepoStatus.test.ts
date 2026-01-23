import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRepoStatus } from "../useRepoStatus";

describe("useRepoStatus", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("starts in loading state", () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            repoPath: null,
            isCloned: false,
            gitUrl: "",
            defaultBranch: "main",
          }),
      })
    ) as any;

    const { result } = renderHook(() => useRepoStatus("project-1"));
    expect(result.current.loading).toBe(true);
  });

  it("fetches repo status on mount", async () => {
    const mockData = {
      repoPath: "/repos/project-1",
      isCloned: true,
      gitUrl: "https://github.com/user/repo",
      defaultBranch: "main",
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    ) as any;

    const { result } = renderHook(() => useRepoStatus("project-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toEqual(mockData);
    expect(result.current.isConfigured).toBe(true);
  });

  it("handles fetch error", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
      })
    ) as any;

    const { result } = renderHook(() => useRepoStatus("project-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it("isConfigured is false when no gitUrl", async () => {
    const mockData = {
      repoPath: null,
      isCloned: false,
      gitUrl: "",
      defaultBranch: "main",
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    ) as any;

    const { result } = renderHook(() => useRepoStatus("project-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConfigured).toBe(false);
  });

  it("refetch function works", async () => {
    const mockData = {
      repoPath: "/repos/project-1",
      isCloned: true,
      gitUrl: "https://github.com/user/repo",
      defaultBranch: "main",
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    ) as any;

    const { result } = renderHook(() => useRepoStatus("project-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initial fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Trigger refetch
    await result.current.refetch();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
