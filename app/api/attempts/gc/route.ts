/**
 * GC Attempts Endpoint (PR-71)
 * POST /api/attempts/gc - Garbage collect stale attempt workspaces
 */
import { NextRequest, NextResponse } from "next/server";
import { gcAttemptWorkspaces } from "@/server/services/execution/gc-attempts";

interface GcRequestBody {
  minAgeMinutes?: number;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    let body: GcRequestBody = {};

    try {
      body = await request.json();
    } catch {
      // Empty body is ok, use defaults
    }

    const result = await gcAttemptWorkspaces({
      minAgeMinutes: body.minAgeMinutes,
      limit: body.limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
