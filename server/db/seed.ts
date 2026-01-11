import { db, initDB } from "./index";
import { projects, tasks } from "./schema";
import { randomUUID } from "crypto";

export async function seed() {
  console.log("🌱 Seeding database...");

  // Initialize tables
  initDB();

  // Check if data already exists
  const existingProjects = await db.select().from(projects);
  if (existingProjects.length > 0) {
    console.log("✅ Database already seeded");
    return;
  }

  // Insert project
  const projectId = "1";
  await db.insert(projects).values({
    id: projectId,
    name: "vibe-kanban",
    gitUrl: "https://github.com/practicalbinarykraft/VIBEKANBAN",
    repoPath: "/Users/aleksandrmishin/Desktop/vibe-kanban", // Local repo path for PoC
    defaultBranch: "main",
    ownerId: "user-owner", // Default owner for permission testing
  });

  // Insert tasks
  await db.insert(tasks).values([
    {
      id: "1",
      projectId,
      title: "Implement user authentication",
      description: "Add OAuth2 authentication flow using NextAuth.js",
      status: "todo",
      order: 0,
    },
    {
      id: "2",
      projectId,
      title: "Create Kanban board UI",
      description: "Build the main kanban interface with drag-and-drop",
      status: "in_progress",
      order: 0,
    },
    {
      id: "3",
      projectId,
      title: "Setup Docker runner",
      description: "Configure isolated Docker containers for agent execution",
      status: "in_review",
      order: 0,
    },
    {
      id: "4",
      projectId,
      title: "Add WebSocket support",
      description: "Implement real-time log streaming via WebSockets",
      status: "done",
      order: 0,
    },
  ]);

  console.log("✅ Database seeded successfully");
}
