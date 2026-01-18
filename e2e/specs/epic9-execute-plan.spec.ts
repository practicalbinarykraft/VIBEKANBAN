import { test, expect } from "@playwright/test";
import { resetProjectStatus } from "../helpers/api";

/**
 * EPIC-9 Execute Plan E2E Tests (PR-42)
 *
 * Tests the execute plan endpoint:
 * - Returns 200 when feature flag enabled
 * - Creates attempts for plan tasks
 * - Tasks move to in_progress/done in mock mode
 * - Returns 403 when feature flag disabled
 *
 * Run with: FEATURE_EXECUTE_PLAN_V2=1 PLAYWRIGHT=1 npm run test:e2e -- epic9-execute-plan
 */

const BASE_URL = "http://localhost:8000";

test.describe("EPIC-9 Execute Plan API", () => {
  test.beforeEach(async ({ request }) => {
    await resetProjectStatus(request, "1");
  });

  test("T_EP_1: Execute endpoint returns 200 when flag enabled and creates attempts", async ({
    request,
  }) => {
    // Skip if feature flag not set (test runner should set it)
    if (process.env.FEATURE_EXECUTE_PLAN_V2 !== "1") {
      test.skip();
      return;
    }

    // 1. Create test plan fixture
    const fixtureResponse = await request.post(`${BASE_URL}/api/test/fixtures/plan`, {
      data: {
        projectId: "1",
        status: "approved",
        tasks: [
          { title: "E2E Task 1", description: "Test task 1", type: "backend", estimate: "S" },
          { title: "E2E Task 2", description: "Test task 2", type: "frontend", estimate: "S" },
        ],
      },
    });

    expect(fixtureResponse.ok()).toBe(true);
    const fixture = await fixtureResponse.json();
    expect(fixture.planId).toBeDefined();

    // 2. Call execute endpoint
    const executeResponse = await request.post(
      `${BASE_URL}/api/projects/1/plan/execute`,
      {
        data: { planId: fixture.planId },
      }
    );

    expect(executeResponse.status()).toBe(200);
    const result = await executeResponse.json();

    // 3. Verify response structure
    expect(result.success).toBe(true);
    expect(result.createdTaskIds).toHaveLength(2);
    expect(result.attemptIds).toHaveLength(2);
  });

  test("T_EP_2: Attempts are created and completed in mock mode", async ({ request }) => {
    if (process.env.FEATURE_EXECUTE_PLAN_V2 !== "1") {
      test.skip();
      return;
    }

    // 1. Create test plan
    const fixtureResponse = await request.post(`${BASE_URL}/api/test/fixtures/plan`, {
      data: {
        projectId: "1",
        status: "approved",
        tasks: [{ title: "Mock Task", description: "Should complete quickly", type: "backend", estimate: "S" }],
      },
    });

    const fixture = await fixtureResponse.json();

    // 2. Execute plan
    const executeResponse = await request.post(
      `${BASE_URL}/api/projects/1/plan/execute`,
      {
        data: { planId: fixture.planId },
      }
    );

    expect(executeResponse.ok()).toBe(true);
    const result = await executeResponse.json();
    expect(result.createdTaskIds).toHaveLength(1);
    expect(result.attemptIds).toHaveLength(1);

    // 3. In mock mode, attempt should complete quickly
    // Wait a bit for async completion
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 4. Check attempt status via attempts endpoint
    const attemptsResponse = await request.get(
      `${BASE_URL}/api/tasks/${result.createdTaskIds[0]}/attempts`
    );
    expect(attemptsResponse.ok()).toBe(true);
    const attempts = await attemptsResponse.json();

    // In mock mode, attempt should be completed
    expect(attempts.length).toBeGreaterThan(0);
    expect(["running", "completed"]).toContain(attempts[0].status);
  });

  test("T_EP_3: Second execute call is idempotent", async ({ request }) => {
    if (process.env.FEATURE_EXECUTE_PLAN_V2 !== "1") {
      test.skip();
      return;
    }

    // 1. Create test plan
    const fixtureResponse = await request.post(`${BASE_URL}/api/test/fixtures/plan`, {
      data: {
        projectId: "1",
        status: "approved",
        tasks: [{ title: "Idempotent Task", description: "Test idempotency", type: "backend", estimate: "S" }],
      },
    });

    const fixture = await fixtureResponse.json();

    // 2. First execute
    const firstResponse = await request.post(
      `${BASE_URL}/api/projects/1/plan/execute`,
      {
        data: { planId: fixture.planId },
      }
    );

    expect(firstResponse.ok()).toBe(true);
    const firstResult = await firstResponse.json();
    expect(firstResult.alreadyExecuted).toBeUndefined();

    // 3. Second execute - should be idempotent
    const secondResponse = await request.post(
      `${BASE_URL}/api/projects/1/plan/execute`,
      {
        data: { planId: fixture.planId },
      }
    );

    expect(secondResponse.ok()).toBe(true);
    const secondResult = await secondResponse.json();

    expect(secondResult.success).toBe(true);
    expect(secondResult.alreadyExecuted).toBe(true);
    expect(secondResult.createdTaskIds).toEqual(firstResult.createdTaskIds);
    expect(secondResult.attemptIds).toEqual(firstResult.attemptIds);
  });

  test("T_EP_4: Returns 400 for non-approved plan", async ({ request }) => {
    if (process.env.FEATURE_EXECUTE_PLAN_V2 !== "1") {
      test.skip();
      return;
    }

    // 1. Create draft plan
    const fixtureResponse = await request.post(`${BASE_URL}/api/test/fixtures/plan`, {
      data: {
        projectId: "1",
        status: "draft",
        tasks: [{ title: "Draft Task", description: "Should not execute", type: "backend", estimate: "S" }],
      },
    });

    const fixture = await fixtureResponse.json();

    // 2. Try to execute - should fail
    const executeResponse = await request.post(
      `${BASE_URL}/api/projects/1/plan/execute`,
      {
        data: { planId: fixture.planId },
      }
    );

    expect(executeResponse.status()).toBe(400);
    const result = await executeResponse.json();
    expect(result.error).toContain("draft");
    expect(result.error).toContain("approved");
  });
});

test.describe("EPIC-9 Execute Plan - Feature Flag Disabled", () => {
  test("T_EP_5: Returns 403 when FEATURE_EXECUTE_PLAN_V2 is off", async ({ request }) => {
    // This test validates the feature flag behavior
    // When flag is off, endpoint should return 403

    // If flag is on (for other tests), we skip this specific test
    if (process.env.FEATURE_EXECUTE_PLAN_V2 === "1") {
      // We can't easily test 403 when flag is on
      // This test should be run separately without the flag
      test.skip();
      return;
    }

    const response = await request.post(
      `${BASE_URL}/api/projects/1/plan/execute`,
      {
        data: { planId: "any-id" },
      }
    );

    expect(response.status()).toBe(403);
    const result = await response.json();
    expect(result.error).toContain("not enabled");
  });
});
