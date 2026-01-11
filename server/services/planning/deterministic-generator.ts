// Deterministic plan generator for E2E tests (PLAYWRIGHT=1)

export interface CouncilMessage {
  role: 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'security';
  content: string;
}

export interface PlanDraft {
  goals: string[];
  milestones: string[];
  tasks: Array<{
    title: string;
    description: string;
    acceptance: string;
    status: 'todo' | 'in_progress' | 'in_review' | 'done';
  }>;
  questions: string[];
}

export function generateCouncilMessages(_ideaText: string): CouncilMessage[] {
  return [
    {
      role: 'pm',
      content: 'I suggest we start with the core domain model and user stories. Let\'s define the key entities and workflows first.',
    },
    {
      role: 'architect',
      content: 'Agreed. I recommend a layered architecture: UI components, API routes, services, and data layer. We should also plan for scalability.',
    },
    {
      role: 'backend',
      content: 'For the backend, I propose using Next.js API routes with SQLite for simplicity. We can migrate to PostgreSQL later if needed.',
    },
    {
      role: 'frontend',
      content: 'On the frontend, let\'s use React with TypeScript and Tailwind CSS. Component library should be Radix UI for accessibility.',
    },
    {
      role: 'qa',
      content: 'We need comprehensive E2E tests using Playwright. Each feature should have test coverage before it\'s considered done.',
    },
    {
      role: 'security',
      content: 'Security considerations: input validation, XSS protection, CSRF tokens, and secure session management. Also, rate limiting for API endpoints.',
    },
  ];
}

export function generatePlanDraft(ideaText: string): PlanDraft {
  // Special case for E2E test seed idea
  if (ideaText.includes('E2E Test Project')) {
    return {
      goals: [
        'Build a functional kanban board',
        'Implement drag-and-drop functionality',
        'Add task management features',
      ],
      milestones: [
        'M1: Project setup and basic UI (Week 1)',
        'M2: Core kanban functionality (Week 2-3)',
        'M3: Task management and persistence (Week 4)',
        'M4: Testing and polish (Week 5)',
      ],
      tasks: [
        {
          title: 'Setup project structure and dependencies',
          description: 'Initialize Next.js project with TypeScript, Tailwind CSS, and required dependencies',
          acceptance: 'Project runs with npm run dev, all dependencies installed',
          status: 'todo',
        },
        {
          title: 'Create database schema',
          description: 'Define SQLite schema for projects, boards, columns, and tasks',
          acceptance: 'Schema file created and migrations working',
          status: 'todo',
        },
        {
          title: 'Build kanban board UI component',
          description: 'Create the main board component with column layout',
          acceptance: 'Board renders with columns, responsive design',
          status: 'todo',
        },
        {
          title: 'Implement drag-and-drop with dnd-kit',
          description: 'Add drag-and-drop functionality for tasks between columns',
          acceptance: 'Tasks can be dragged between columns smoothly',
          status: 'todo',
        },
        {
          title: 'Create task card component',
          description: 'Design and implement individual task cards',
          acceptance: 'Task cards display title, description, and status',
          status: 'todo',
        },
        {
          title: 'Add task CRUD operations',
          description: 'Implement create, read, update, delete for tasks',
          acceptance: 'All CRUD operations work via API',
          status: 'todo',
        },
        {
          title: 'Build task details panel',
          description: 'Create side panel for viewing/editing task details',
          acceptance: 'Panel opens on task click, shows all task data',
          status: 'todo',
        },
        {
          title: 'Implement task filtering',
          description: 'Add filters for task status, assignee, labels',
          acceptance: 'Filters work correctly, update URL params',
          status: 'todo',
        },
        {
          title: 'Add E2E tests with Playwright',
          description: 'Write comprehensive E2E tests for all features',
          acceptance: 'All tests pass, coverage >80%',
          status: 'todo',
        },
        {
          title: 'Setup CI/CD pipeline',
          description: 'Configure GitHub Actions for tests and deployment',
          acceptance: 'Pipeline runs on every PR, auto-deploys on merge',
          status: 'todo',
        },
        {
          title: 'Add authentication',
          description: 'Implement user authentication with NextAuth.js',
          acceptance: 'Users can sign in/out, sessions persist',
          status: 'todo',
        },
        {
          title: 'Implement real-time updates',
          description: 'Add WebSocket support for live board updates',
          acceptance: 'Changes sync across all connected clients',
          status: 'todo',
        },
        {
          title: 'Build settings page',
          description: 'Create page for board and user settings',
          acceptance: 'Settings can be viewed and updated',
          status: 'todo',
        },
        {
          title: 'Add keyboard shortcuts',
          description: 'Implement keyboard navigation and shortcuts',
          acceptance: 'All major actions have keyboard shortcuts',
          status: 'todo',
        },
        {
          title: 'Polish UI and accessibility',
          description: 'Final UI polish, ARIA labels, dark mode',
          acceptance: 'Lighthouse score >90, WCAG AA compliant',
          status: 'todo',
        },
      ],
      questions: [
        'Should we support multiple boards per project?',
        'Do we need role-based permissions (admin/member/viewer)?',
        'What authentication providers should we support?',
      ],
    };
  }

  // Generic plan for other ideas
  return {
    goals: [
      'Define core features and user experience',
      'Build scalable and maintainable architecture',
      'Deliver MVP in 4-6 weeks',
    ],
    milestones: [
      'M1: Foundation and setup (Week 1)',
      'M2: Core functionality (Week 2-3)',
      'M3: Polish and testing (Week 4)',
    ],
    tasks: generateGenericTasks(ideaText),
    questions: [
      'What are the top 3 priorities for the MVP?',
      'Who are the target users?',
      'What is the success metric?',
    ],
  };
}

function generateGenericTasks(ideaText: string): PlanDraft['tasks'] {
  const baseTaskCount = 15;
  const tasks: PlanDraft['tasks'] = [];

  for (let i = 1; i <= baseTaskCount; i++) {
    tasks.push({
      title: `Task ${i}: Implement feature based on ${ideaText.slice(0, 30)}`,
      description: `Detailed implementation for task ${i}`,
      acceptance: `Task ${i} completed and tested`,
      status: 'todo',
    });
  }

  return tasks;
}
