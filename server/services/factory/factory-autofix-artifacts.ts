/** Factory Auto-Fix Artifacts (PR-99) - Save autofix reports to artifacts table */
import { db } from "@/server/db";
import { artifacts } from "@/server/db/schema";
import { randomUUID } from "crypto";
import type { AutofixReport } from "./factory-auto-fix.service";

export const AUTOFIX_REPORT_TYPE = "factory_autofix_report";

/**
 * Save an autofix report as an artifact.
 */
export async function saveAutofixReport(attemptId: string, report: AutofixReport): Promise<string> {
  const artifactId = randomUUID();

  await db.insert(artifacts).values({
    id: artifactId,
    attemptId,
    type: AUTOFIX_REPORT_TYPE,
    content: JSON.stringify(report),
  });

  return artifactId;
}

/**
 * Get autofix report artifact by attemptId.
 */
export async function getAutofixReport(attemptId: string): Promise<AutofixReport | null> {
  const rows = await db.select().from(artifacts);
  const row = rows.find(
    (r) => r.attemptId === attemptId && r.type === AUTOFIX_REPORT_TYPE
  );

  if (!row) return null;

  try {
    return JSON.parse(row.content) as AutofixReport;
  } catch {
    return null;
  }
}
