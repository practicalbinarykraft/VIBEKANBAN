"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/planning", label: "Planning" },
  { href: "/projects", label: "Projects" },
  { href: "/mcp-servers", label: "MCP Servers" },
  { href: "/settings", label: "Settings" },
  { href: "/docs", label: "Docs" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container flex h-12 items-center px-4">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-foreground" />
            <span className="text-sm font-semibold">Vibe Kanban</span>
          </Link>
          <nav className="flex items-center gap-4 text-xs">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative pb-0.5 transition-colors hover:text-foreground",
                  pathname?.startsWith(item.href)
                    ? "text-foreground font-medium after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground after:rounded-full"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
