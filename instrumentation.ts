export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import and seed database (directory creation is handled by db module)
    const { seed } = await import("./server/db/seed");
    await seed();
  }
}
