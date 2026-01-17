/**
 * Council component types (EPIC-9)
 */

export type CouncilRole = "product" | "architect" | "backend" | "frontend" | "qa";
export type MessageKind = "message" | "question" | "concern" | "proposal" | "consensus";

export interface CouncilMessage {
  id: string;
  role: CouncilRole;
  content: string;
  kind: MessageKind;
  turnIndex: number;
  createdAt: Date;
}

export interface CouncilThread {
  id: string;
  projectId: string;
  iterationNumber: number;
  status: string;
  ideaText: string | null;
  language: string;
  currentTurn: number;
  messages: CouncilMessage[];
}

export interface PlanTask {
  title: string;
  description: string;
  type: "backend" | "frontend" | "qa" | "design";
  estimate: "S" | "M" | "L";
}

export interface PlanArtifact {
  id: string;
  threadId: string;
  version: number;
  status: "draft" | "revised" | "approved" | "final";
  summary: string;
  scope: string;
  tasks: PlanTask[];
  taskCount: number;
  estimate: "S" | "M" | "L";
  createdAt: Date;
}
