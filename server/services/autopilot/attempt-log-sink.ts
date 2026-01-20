/** Attempt Log Sink (PR-66) - Append and list attempt logs */
import { db } from "@/server/db";
import { logs } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

export type LogLevel = "info" | "warning" | "error";

export interface LogLine {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
}

export interface ListLogsResult {
  lines: LogLine[];
  nextCursor?: number;
}

export class AttemptLogSink {
  async append(attemptId: string, level: LogLevel, message: string): Promise<void> {
    await db.insert(logs).values({
      id: randomUUID(),
      attemptId,
      timestamp: new Date(),
      level,
      message,
    });
  }

  async list(attemptId: string, limit = 100, cursor = 0): Promise<ListLogsResult> {
    const allLogs = await db.select().from(logs)
      .where(eq(logs.attemptId, attemptId))
      .orderBy(asc(logs.timestamp));

    const sliced = allLogs.slice(cursor, cursor + limit);
    const hasMore = cursor + limit < allLogs.length;

    return {
      lines: sliced.map(l => ({
        id: l.id,
        timestamp: l.timestamp,
        level: l.level as LogLevel,
        message: l.message,
      })),
      nextCursor: hasMore ? cursor + limit : undefined,
    };
  }
}
