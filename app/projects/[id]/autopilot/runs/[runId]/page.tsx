/**
 * Autopilot Run Details Page (PR-75)
 * Shows run summary and attempts list with drill-down to logs
 */
import { RunDetailsClient } from "./run-details-client";

interface PageProps {
  params: Promise<{ id: string; runId: string }>;
}

export default async function RunDetailsPage({ params }: PageProps) {
  const { id: projectId, runId } = await params;
  return <RunDetailsClient projectId={projectId} runId={runId} />;
}
