/**
 * Centralized data-testid constants for E2E testing
 *
 * Usage:
 * - Import: import { TestIds } from '@/types/test-ids'
 * - Use: data-testid={TestIds.KANBAN.BOARD}
 * - Dynamic: data-testid={TestIds.KANBAN.taskCard(taskId)}
 *
 * Naming convention:
 * - Use SCREAMING_SNAKE_CASE for static IDs
 * - Use camelCase functions for dynamic IDs
 */

export const TestIds = {
  // Kanban Board
  KANBAN: {
    BOARD: 'kanban-board',
    BOARD_REFRESHING: 'board-refreshing',
    column: (status: string) => `column-${status}`,
    taskCard: (taskId: string) => `task-card-${taskId}`,
  },

  // Task Details Panel
  TASK_DETAILS: {
    PANEL: 'task-details-panel',
    TITLE: 'task-title',
    DESCRIPTION: 'task-description',
    CLOSE_BUTTON: 'close-details',
    ENRICHMENT: 'task-enrichment',
    PRIORITY: 'task-priority',
    ESTIMATE: 'task-estimate',
    TAGS: 'task-tags',
  },

  // Task Tabs
  TASK_TABS: {
    CONTAINER: 'task-tabs',
    LOGS: 'tab-logs',
    DIFFS: 'tab-diffs',
    SUMMARY: 'tab-summary',
  },

  // Execution Controls
  EXECUTION: {
    STATUS: 'execution-status',
    START_BUTTON: 'execution-start-button',
    RUN_ALL_BUTTON: 'run-all-button',
    PAUSE_BUTTON: 'pause-button',
    RESUME_BUTTON: 'resume-button',
    DETAILS: 'execution-details',
    RESULT_SUMMARY: 'execution-result-summary',
    AGENT_ROLE: 'agent-role',
  },

  // Planning Tab
  PLANNING: {
    IDEA_INPUT: 'planning-idea-input',
    START_BUTTON: 'planning-start-button',
    START_COUNCIL_BUTTON: 'start-council-btn',
    RESPONSE_INPUT: 'response-input',
    SUBMIT_RESPONSE_BUTTON: 'submit-response-btn',
    SESSION_STATUS: 'session-status',
    QUESTIONS_STEP: 'planning-questions-step',
    QUESTIONS_CONTINUE: 'planning-questions-continue',
    question: (idx: number) => `planning-question-${idx}`,
    answer: (idx: number) => `planning-answer-${idx}`,
  },

  // Plan Results & Quality
  PLAN: {
    DRAFT: 'plan-draft',
    DRAFT_TASKS: 'draft-tasks',
    draftTask: (idx: number) => `draft-task-${idx}`,
    CONFIRM_BUTTON: 'confirm-button',
    QUALITY_GATE: 'plan-quality-gate',
    qualityReason: (idx: number) => `plan-quality-reason-${idx}`,
  },

  // Council (EPIC-9)
  COUNCIL: {
    PANEL: 'council-panel',
    CHAT: 'council-chat',
    MESSAGE: 'council-message',
    MESSAGE_ROLE: 'message-role',
    MESSAGES: 'council-messages',
    CONSOLE: 'council-console',
    DIALOGUE: 'council-dialogue',
    message: (role: string) => `council-message-${role}`,
    councilMsg: (role: string) => `council-msg-${role}`,
    councilMessageIdx: (idx: number) => `council-message-${idx}`,
  },

  // Autopilot (EPIC-7)
  AUTOPILOT: {
    PANEL: 'autopilot-panel',
    STATUS: 'autopilot-status',
    TASK_PROGRESS: 'autopilot-task-progress',
    PROGRESS_BAR: 'autopilot-progress-bar',
    ERROR: 'autopilot-error',
    STEP_BUTTON: 'autopilot-step-button',
    AUTO_BUTTON: 'autopilot-auto-button',
    RESUME_BUTTON: 'autopilot-resume-button',
    CANCEL_BUTTON: 'autopilot-cancel-button',
    APPROVE_BUTTON: 'autopilot-approve-button',
    RETRY_BUTTON: 'autopilot-retry-button',
    DONE: 'autopilot-done',
  },

  // PR Preview
  PR: {
    PREVIEW: 'pr-preview',
    LINK: 'pr-link',
    STATUS_BADGE: 'pr-status-badge',
    SYNC_BUTTON: 'sync-pr-button',
    CREATE_BUTTON: 'create-pr-button',
  },

  // Project Chat
  CHAT: {
    CONTAINER: 'project-chat',
    MESSAGE_USER: 'chat-message-user',
    MESSAGE_AI: 'chat-message-ai',
    STATUS_INDICATOR: 'chat-status-indicator',
    ERROR: 'chat-error',
    MESSAGE_INPUT: 'message-input',
    SEND_BUTTON: 'send-button',
    TAB: 'chat-tab',
  },

  // Projects
  PROJECTS: {
    NEW_BUTTON: 'new-project-button',
    NEW_MODAL: 'new-project-modal',
    NAME_INPUT: 'new-project-name-input',
    GIT_URL_INPUT: 'new-project-git-url-input',
    CREATE_SUBMIT: 'create-project-submit',
    ERROR: 'new-project-error',
    CONNECTION_BADGE: 'connection-badge',
    CONNECTION_BADGE_LOADING: 'connection-badge-loading',
  },

  // Project Tabs
  PROJECT_TABS: {
    TASKS: 'tasks-tab',
    CHAT: 'chat-tab',
    PLANNING: 'planning-tab',
  },

  // Conflict Resolution
  CONFLICT: {
    BLOCK: 'conflict-block',
    FILES_LIST: 'conflict-files-list',
    OPEN_WORKSPACE_BUTTON: 'open-workspace-button',
    MARK_RESOLVED_BUTTON: 'mark-resolved-button',
  },

  // Apply/Merge
  APPLY: {
    ERROR: 'apply-error',
    NO_CHANGES_MESSAGE: 'no-changes-message',
  },

  // Iteration Summary
  ITERATION: {
    SUMMARY: 'iteration-summary',
    ITERATE_BUTTON: 'iterate-button',
  },

  // Settings
  SETTINGS: {
    AI_MODE_SECTION: 'ai-mode-section',
  },

  // AI Mode Banner
  AI_MODE: {
    BANNER: 'ai-mode-banner',
  },

  // Common/Utility
  COMMON: {
    FRIENDLY_ERROR: 'friendly-error',
  },

  // Attempts/History
  ATTEMPTS: {
    HISTORY: 'attempts-history',
    item: (attemptId: string) => `attempt-item-${attemptId}`,
  },
} as const;

// Type for extracting all static test IDs
export type TestIdValue = string;
