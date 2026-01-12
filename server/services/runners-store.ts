import { DockerRunner } from "./docker-runner";
import { StubRunner } from "./stub-runner";

type Runner = DockerRunner | StubRunner;

// Global store for active runners
const runnersStore = new Map<string, Runner>();

export function registerRunner(attemptId: string, runner: Runner) {
  runnersStore.set(attemptId, runner);
}

export function getRunner(attemptId: string): Runner | undefined {
  return runnersStore.get(attemptId);
}

export function unregisterRunner(attemptId: string) {
  runnersStore.delete(attemptId);
}
