/** Factory Enqueue API Route Tests (PR-106) - TDD */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the service module
vi.mock("@/server/services/factory/factory-auto-enqueue.service", () => ({
  autoEnqueueTask: vi.fn(),
}));

import { POST } from "@/app/api/projects/[id]/factory/enqueue/route";
import { autoEnqueueTask } from "@/server/services/factory/factory-auto-enqueue.service";

const mockAutoEnqueueTask = vi.mocked(autoEnqueueTask);

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/projects/proj-1/factory/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/projects/[id]/factory/enqueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when taskId is missing", async () => {
    const request = createRequest({});
    const response = await POST(request, { params: Promise.resolve({ id: "proj-1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("taskId is required");
  });

  it("calls service with correct params", async () => {
    mockAutoEnqueueTask.mockResolvedValue({ ok: true, runId: "run-123", enqueued: true });

    const request = createRequest({ taskId: "task-1" });
    await POST(request, { params: Promise.resolve({ id: "proj-1" }) });

    expect(mockAutoEnqueueTask).toHaveBeenCalledWith({
      projectId: "proj-1",
      taskId: "task-1",
      reason: "status_change",
    });
  });

  it("returns success response when enqueued", async () => {
    mockAutoEnqueueTask.mockResolvedValue({ ok: true, runId: "run-123", enqueued: true });

    const request = createRequest({ taskId: "task-1" });
    const response = await POST(request, { params: Promise.resolve({ id: "proj-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.runId).toBe("run-123");
    expect(data.enqueued).toBe(true);
  });

  it("returns success response when deduplicated (enqueued: false)", async () => {
    mockAutoEnqueueTask.mockResolvedValue({ ok: true, runId: "run-123", enqueued: false });

    const request = createRequest({ taskId: "task-1" });
    const response = await POST(request, { params: Promise.resolve({ id: "proj-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.runId).toBe("run-123");
    expect(data.enqueued).toBe(false);
  });

  it("returns 400 when task not runnable", async () => {
    mockAutoEnqueueTask.mockResolvedValue({ ok: false, errorCode: "TASK_NOT_RUNNABLE" });

    const request = createRequest({ taskId: "task-done" });
    const response = await POST(request, { params: Promise.resolve({ id: "proj-1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("TASK_NOT_RUNNABLE");
  });

  it("returns 500 when run creation fails", async () => {
    mockAutoEnqueueTask.mockResolvedValue({ ok: false, errorCode: "RUN_CREATION_FAILED" });

    const request = createRequest({ taskId: "task-1" });
    const response = await POST(request, { params: Promise.resolve({ id: "proj-1" }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("RUN_CREATION_FAILED");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new NextRequest("http://localhost:3000/api/projects/proj-1/factory/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "proj-1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });
});
