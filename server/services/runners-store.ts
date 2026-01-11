import { DockerRunner } from "./docker-runner";

// Global store for active runners
const runnersStore = new Map<string, DockerRunner>();

export function registerRunner(attemptId: string, runner: DockerRunner) {
  runnersStore.set(attemptId, runner);
}

export function getRunner(attemptId: string): DockerRunner | undefined {
  return runnersStore.get(attemptId);
}

export function unregisterRunner(attemptId: string) {
  runnersStore.delete(attemptId);
}
