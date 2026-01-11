import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { processedWebhooks } from "@/server/db/schema";

/**
 * DELETE /api/test/webhooks/clear
 *
 * Clear processed webhooks table for test isolation
 * ONLY works in test/dev environments
 */

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.PLAYWRIGHT === "1"
  );
}

export async function DELETE() {
  if (!isTestEnvironment()) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  try {
    await db.delete(processedWebhooks);

    return NextResponse.json({
      success: true,
      message: "Processed webhooks cleared"
    });
  } catch (error: any) {
    console.error("Error clearing processed webhooks:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
