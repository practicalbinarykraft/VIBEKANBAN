import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Health check endpoint for E2E test runner.
 * Returns { ok: true } when server is ready.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: Date.now(),
    env: process.env.NODE_ENV || "development",
  });
}
