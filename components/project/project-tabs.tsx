/**
 * ProjectTabs - Tab navigation for project views (PR-126: merged Chat into Planning)
 */

import { ListTodo, Lightbulb } from "lucide-react";

type TabType = "tasks" | "planning";

interface ProjectTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function ProjectTabs({ activeTab, onTabChange }: ProjectTabsProps) {
  return (
    <div className="border-b border-border bg-background">
      <div className="flex gap-1 px-3 pt-2">
        <button
          onClick={() => onTabChange("tasks")}
          className={`flex items-center gap-2 rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "tasks" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tasks-tab"
        >
          <ListTodo className="h-4 w-4" />
          Tasks
        </button>
        <button
          onClick={() => onTabChange("planning")}
          className={`flex items-center gap-2 rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "planning" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="planning-tab"
        >
          <Lightbulb className="h-4 w-4" />
          Planning
        </button>
      </div>
    </div>
  );
}
