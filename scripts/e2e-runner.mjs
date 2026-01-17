#!/usr/bin/env node
/**
 * E2E Test Runner - Stable, deterministic test execution
 * Builds production app, starts server on port 3001, runs Playwright tests
 */
import { spawn, execSync } from "child_process";
import { createServer } from "http";

const E2E_PORT = 3001;
const HEALTH_URL = `http://localhost:${E2E_PORT}/api/health`;
const HEALTH_TIMEOUT = 120000;

let serverProcess = null;

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

const log = (msg) => console.log(cyan("[e2e-runner]"), msg);
const logError = (msg) => console.error(red("[e2e-runner] ERROR:"), msg);
const logSuccess = (msg) => console.log(green("[e2e-runner]"), msg);

function killPort(port) {
  try {
    const result = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: "utf8" }).trim();
    if (result) {
      result.split("\n").filter(Boolean).forEach((pid) => {
        try { process.kill(parseInt(pid), "SIGKILL"); } catch (e) {}
      });
      execSync("sleep 1");
    }
  } catch (e) {}
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => { server.close(); resolve(true); });
    server.listen(port);
  });
}

async function waitForHealth(url, timeout) {
  const start = Date.now();
  log(`Waiting for server health at ${url}...`);
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) return true;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function buildApp() {
  log("Building Next.js app...");
  try {
    execSync("npm run build", {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1", PLAYWRIGHT: "1" },
    });
    logSuccess("Build completed");
    return true;
  } catch (e) {
    logError("Build failed");
    return false;
  }
}

function startServer() {
  log(`Starting production server on port ${E2E_PORT}...`);
  serverProcess = spawn("npx", ["next", "start", "-p", String(E2E_PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "test", PORT: String(E2E_PORT), PLAYWRIGHT: "1" },
  });
  serverProcess.stdout.on("data", (d) => console.log(`[server] ${d.toString().trim()}`));
  serverProcess.stderr.on("data", (d) => console.error(`[server] ${d.toString().trim()}`));
  return serverProcess;
}

function runTests() {
  log("Running Playwright tests...");
  try {
    execSync("npx playwright test --workers=2", {
      stdio: "inherit",
      env: { ...process.env, PLAYWRIGHT: "1", PLAYWRIGHT_BASE_URL: `http://localhost:${E2E_PORT}` },
    });
    return true;
  } catch (e) {
    return false;
  }
}

function cleanup() {
  if (serverProcess) {
    log("Stopping server...");
    serverProcess.kill("SIGTERM");
    setTimeout(() => { if (serverProcess && !serverProcess.killed) serverProcess.kill("SIGKILL"); }, 5000);
    serverProcess = null;
  }
  killPort(E2E_PORT);
}

async function main() {
  log("=== E2E Test Runner Started ===");
  process.on("SIGINT", () => { cleanup(); process.exit(130); });
  process.on("SIGTERM", () => { cleanup(); process.exit(143); });

  try {
    log("Cleaning up old processes...");
    killPort(3000);
    killPort(E2E_PORT);

    log("Cleaning up data directory for fresh DB...");
    try { execSync("rm -rf data/", { stdio: "ignore" }); } catch (e) {}

    if (!(await isPortAvailable(E2E_PORT))) {
      logError(`Port ${E2E_PORT} is still in use`);
      process.exit(1);
    }
    logSuccess(`Port ${E2E_PORT} is available`);

    if (!buildApp()) process.exit(1);

    startServer();

    if (!(await waitForHealth(HEALTH_URL, HEALTH_TIMEOUT))) {
      logError(`Server failed to become healthy within ${HEALTH_TIMEOUT / 1000}s`);
      cleanup();
      process.exit(1);
    }
    logSuccess("Server is healthy and ready");

    const testsPass = runTests();
    cleanup();

    if (testsPass) {
      logSuccess("=== All E2E tests passed ===");
      process.exit(0);
    } else {
      logError("=== E2E tests failed ===");
      process.exit(1);
    }
  } catch (e) {
    logError(`Unexpected error: ${e.message}`);
    cleanup();
    process.exit(1);
  }
}

main();
