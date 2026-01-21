/**
 * Factory Run Details Page (PR-91)
 * Shows factory run summary, counts, and attempts list
 */
import { FactoryRunDetailsClient } from "./factory-run-details-client";

interface PageProps {
  params: Promise<{ id: string; runId: string }>;
}

export default async function FactoryRunDetailsPage({ params }: PageProps) {
  const { id: projectId, runId } = await params;
  return <FactoryRunDetailsClient projectId={projectId} runId={runId} />;
}
