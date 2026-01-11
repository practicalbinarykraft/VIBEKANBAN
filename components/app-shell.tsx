import { TopNav } from "./top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
