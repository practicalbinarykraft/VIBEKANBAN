/**
 * Council & Planning Types (EPIC-9)
 *
 * Types for the AI Council dialogue system, plan artifacts with versioning,
 * and autopilot status tracking.
 */

// ============================================================================
// Council Thread Types
// ============================================================================

/**
 * Council member roles
 */
export type CouncilRole = 'product' | 'architect' | 'backend' | 'frontend' | 'qa' | 'security';

/**
 * Council thread status - tracks the discussion state
 */
export type CouncilThreadStatus =
  | 'discussing'        // Council is actively discussing
  | 'awaiting_response' // Waiting for user input/clarification
  | 'plan_ready'        // Plan has been generated and is ready for review
  | 'approved'          // User approved the plan
  | 'completed';        // Plan has been applied/executed

/**
 * Council message kind - categorizes the type of message
 */
export type CouncilMessageKind =
  | 'message'    // General message
  | 'question'   // Question to user or other council members
  | 'concern'    // Raised concern about the approach
  | 'proposal'   // Specific proposal for implementation
  | 'consensus'; // Agreement reached

/**
 * Council thread - represents a single planning discussion
 */
export interface CouncilThread {
  id: string;
  projectId: string;
  iterationNumber: number;
  status: CouncilThreadStatus;
  ideaText?: string | null;
  language: string; // User language (en, ru, etc.)
  currentTurn: number;
  createdAt: Date;
}

/**
 * Council thread message - individual message in a thread
 */
export interface CouncilThreadMessage {
  id: string;
  threadId: string;
  role: CouncilRole;
  content: string;
  kind: CouncilMessageKind;
  turnIndex: number;
  createdAt: Date;
}

/**
 * Council message (legacy format for planning sessions)
 */
export interface CouncilMessage {
  id: string;
  sessionId: string;
  role: CouncilRole | 'pm'; // 'pm' is legacy, maps to 'product'
  content: string;
  createdAt: Date;
}

// ============================================================================
// Plan Artifact Types
// ============================================================================

/**
 * Plan artifact status - tracks the plan's lifecycle
 */
export type PlanArtifactStatus =
  | 'draft'    // Initial draft created by council
  | 'revised'  // Plan has been revised based on feedback
  | 'approved' // User approved the plan
  | 'final';   // Plan is finalized and ready for execution

/**
 * Plan task estimate sizes
 */
export type TaskEstimate = 'S' | 'M' | 'L';

/**
 * Plan task type categories
 */
export type PlanTaskType = 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs' | 'infra';

/**
 * Individual task within a plan artifact
 */
export interface PlanTask {
  title: string;
  description: string;
  type?: PlanTaskType;
  estimate?: TaskEstimate;
  acceptance?: string; // Acceptance criteria
  status?: 'pending' | 'completed'; // For tracking during execution
}

/**
 * Plan artifact - versioned planning document from council
 */
export interface PlanArtifact {
  id: string;
  threadId: string;
  version: number;
  status: PlanArtifactStatus;
  summary: string;
  scope: string;
  tasks: PlanTask[];
  taskCount: number;
  estimate: TaskEstimate;
  createdAt: Date;
}

/**
 * Plan artifact with thread context
 */
export interface PlanArtifactWithThread extends PlanArtifact {
  thread: CouncilThread;
}

// ============================================================================
// Autopilot Types (re-exported from autopilot-machine for convenience)
// ============================================================================

/**
 * Autopilot execution modes
 */
export type AutopilotMode = 'OFF' | 'STEP' | 'AUTO';

/**
 * Autopilot status - tracks execution state
 */
export type AutopilotStatus =
  | 'IDLE'             // Autopilot not started
  | 'RUNNING'          // Currently executing tasks
  | 'PAUSED'           // Paused (manual or after step completion)
  | 'WAITING_APPROVAL' // Waiting for user approval (batch complete)
  | 'DONE'             // All tasks completed
  | 'FAILED';          // Execution failed

/**
 * Task execution tracking within autopilot
 */
export interface AutopilotTaskExecution {
  taskId: string;
  attemptId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

/**
 * Autopilot state (serializable for storage)
 */
export interface AutopilotState {
  status: AutopilotStatus;
  mode: AutopilotMode;
  taskQueue: string[];
  currentTaskIndex: number;
  currentAttemptId?: string;
  completedTasks: string[];
  openPrCount: number;
  pauseReason?: string;
  error?: string;
}

// ============================================================================
// Planning Session Types
// ============================================================================

/**
 * Planning session status
 */
export type PlanningSessionStatus =
  | 'DISCUSSION'   // Council is discussing
  | 'RESULT_READY' // Plan is ready for review
  | 'APPLIED';     // Plan has been applied to tasks

/**
 * Planning session - contains the full planning context
 */
export interface PlanningSession {
  id: string;
  projectId?: string | null;
  userId?: string | null;
  title?: string | null;
  ideaText: string;
  status: PlanningSessionStatus;
  productResult?: string | null; // JSON string
  appliedTaskIds?: string | null; // JSON string array
  autopilotState?: string | null; // JSON string (AutopilotState)
  questionPhaseComplete: boolean;
  userAnswers?: string | null; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Plan draft - intermediate planning output
 */
export interface PlanDraft {
  id: string;
  sessionId: string;
  goals: string; // JSON
  milestones: string; // JSON
  tasks: PlanTask[];
  questions?: string[]; // Optional clarifying questions
  createdAt: Date;
}
