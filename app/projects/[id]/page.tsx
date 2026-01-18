import ProjectClient from "./project-client";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Read feature flag on server (runtime)
  const enableAutopilotV2 = process.env.FEATURE_AUTOPILOT_V2 === "1";

  return <ProjectClient projectId={id} enableAutopilotV2={enableAutopilotV2} />;
}
