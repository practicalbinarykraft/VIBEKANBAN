/** Task Reorder Dependencies (PR-104) - Real DB implementations */
import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { ReorderTaskDeps, TaskRecord } from "./task-reorder.service";
import type { TaskPosition, TaskUpdate } from "@/lib/task-reorder.logic";

export function createReorderDeps(): ReorderTaskDeps {
  return {
    getTaskById: async (taskId: string): Promise<TaskRecord | null> => {
      const row = await db.select({
        id: tasks.id,
        projectId: tasks.projectId,
        status: tasks.status,
        order: tasks.order,
      })
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .get();

      return row ?? null;
    },

    getTasksByProject: async (projectId: string): Promise<TaskPosition[]> => {
      const rows = await db.select({
        id: tasks.id,
        status: tasks.status,
        order: tasks.order,
      })
        .from(tasks)
        .where(eq(tasks.projectId, projectId));

      return rows;
    },

    updateTaskPositions: async (updates: TaskUpdate[]): Promise<boolean> => {
      // Update each task's status and order in a transaction
      await db.transaction(async (tx) => {
        for (const update of updates) {
          await tx.update(tasks)
            .set({ status: update.status, order: update.order })
            .where(eq(tasks.id, update.id));
        }
      });
      return true;
    },
  };
}
