/** Attempt Artifact Store (PR-66) - Save and retrieve attempt artifacts */
import { db } from "@/server/db";
import { artifacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export type ArtifactKind = "runner_output" | "error" | "summary";

export interface ArtifactPayload {
  kind: ArtifactKind;
  data: Record<string, unknown>;
}

export interface SaveResult {
  artifactId: string;
}

export interface ArtifactData {
  artifactId: string;
  attemptId: string;
  kind: ArtifactKind;
  data: Record<string, unknown>;
  createdAt: Date;
}

export class AttemptArtifactStore {
  async save(attemptId: string, payload: ArtifactPayload): Promise<SaveResult> {
    const artifactId = randomUUID();

    await db.insert(artifacts).values({
      id: artifactId,
      attemptId,
      type: payload.kind,
      content: JSON.stringify(payload.data),
    });

    return { artifactId };
  }

  async get(artifactId: string): Promise<ArtifactData | null> {
    const artifact = await db.select().from(artifacts)
      .where(eq(artifacts.id, artifactId))
      .get();

    if (!artifact) {
      return null;
    }

    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(artifact.content);
    } catch {
      data = { raw: artifact.content };
    }

    return {
      artifactId: artifact.id,
      attemptId: artifact.attemptId,
      kind: artifact.type as ArtifactKind,
      data,
      createdAt: artifact.createdAt,
    };
  }
}
