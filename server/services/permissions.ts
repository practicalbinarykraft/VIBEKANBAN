/**
 * Permissions & Access Control
 *
 * Responsibility: Check user permissions for actions
 *
 * Why separate file:
 * - Single responsibility: access control only
 * - Reusable across all protected endpoints
 * - Easy to extend for RBAC in future
 * - Keeps endpoint files under 200 LOC
 */

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { projects, tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get current user ID from request
 * In test mode: uses test-user-id cookie
 * In production: would integrate with auth provider (NextAuth/Clerk)
 */
export async function getCurrentUserId(request?: NextRequest): Promise<string> {
  const cookieStore = await cookies();

  // Test mode: use test-user-id cookie
  if (process.env.PLAYWRIGHT === '1' || process.env.NODE_ENV === 'test') {
    const testUserId = cookieStore.get('test-user-id');
    return testUserId?.value || 'user-owner'; // Default to owner in tests
  }

  // Production: integrate with auth provider
  // TODO: Replace with NextAuth/Clerk session
  // const session = await getServerSession();
  // return session?.user?.id || 'anonymous';

  return 'user-owner'; // Default owner for now
}

/**
 * Check if user is project owner
 */
export async function isProjectOwner(
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  if (!project) return false;

  // If ownerId not set, default to owner (backward compatibility)
  if (!project.ownerId) return true;

  return project.ownerId === userId;
}

/**
 * Check if user can perform action on task
 */
export async function canPerformTaskAction(
  taskId: string,
  userId: string
): Promise<boolean> {
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) return false;

  return isProjectOwner(task.projectId, userId);
}

/**
 * Permission error response
 */
export function permissionDeniedError() {
  return {
    error: 'You do not have permission to perform this action',
    code: 'PERMISSION_DENIED',
  };
}
