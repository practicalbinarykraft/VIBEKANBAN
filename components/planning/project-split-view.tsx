/**
 * ProjectSplitView - Replit-like split planning layout (PR-126)
 *
 * Two-panel layout:
 * - Left: PM Chat (ProjectChat)
 * - Right: Council Console (PlanningTab in compact mode)
 *
 * Combines Chat and Planning functionality in one view.
 */

"use client";

import { useState } from "react";
import { ProjectChat } from "@/components/chat/project-chat";
import { PlanningTab } from "./planning-tab";

interface ProjectSplitViewProps {
  projectId: string;
  enableAutopilotV2?: boolean;
  onApplyComplete?: (createdTaskIds: string[]) => void;
  onAutopilotComplete?: () => void;
  onAutopilotSessionCreated?: (sessionId: string, taskIds: string[]) => void;
}

export function ProjectSplitView({
  projectId,
  enableAutopilotV2 = false,
  onApplyComplete,
  onAutopilotComplete,
  onAutopilotSessionCreated,
}: ProjectSplitViewProps) {
  // Track if chat has user messages (needed for Run Consilium button)
  const [hasUserMessages, setHasUserMessages] = useState(false);

  return (
    <div
      className="flex h-full w-full overflow-hidden"
      data-testid="project-split-view"
    >
      {/* Left Panel: PM Chat */}
      <div
        className="flex h-full w-1/2 flex-col border-r"
        data-testid="split-left-panel"
      >
        <ProjectChat
          projectId={projectId}
          onHasUserMessages={setHasUserMessages}
        />
      </div>

      {/* Right Panel: Council Console */}
      <div
        className="flex h-full w-1/2 flex-col"
        data-testid="split-right-panel"
      >
        <PlanningTab
          projectId={projectId}
          compactMode
          hasUserMessages={hasUserMessages}
          enableAutopilotV2={enableAutopilotV2}
          onApplyComplete={onApplyComplete}
          onAutopilotComplete={onAutopilotComplete}
          onAutopilotSessionCreated={onAutopilotSessionCreated}
        />
      </div>
    </div>
  );
}
