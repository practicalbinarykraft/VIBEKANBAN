import { EventEmitter } from "events";

// Global event hub for coordinating events between runner and SSE streams
class EventsHub extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many concurrent SSE connections
  }
}

export const eventsHub = new EventsHub();

// Event types
export interface AttemptLogEvent {
  attemptId: string;
  timestamp: Date;
  level: "info" | "warning" | "error";
  message: string;
}

export interface AttemptStatusEvent {
  attemptId: string;
  status: "pending" | "queued" | "running" | "completed" | "failed" | "stopped";
  exitCode?: number;
}

export interface PRStatusEvent {
  attemptId: string;
  prStatus: "open" | "merged" | "closed";
}

// Emit events
export function emitAttemptLog(event: AttemptLogEvent) {
  eventsHub.emit("attempt:log", event);
}

export function emitAttemptStatus(event: AttemptStatusEvent) {
  eventsHub.emit("attempt:status", event);
}

export function emitPRStatus(event: PRStatusEvent) {
  eventsHub.emit("pr:status", event);
}
