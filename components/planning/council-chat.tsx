/**
 * CouncilChat - Display read-only council messages
 *
 * Shows messages from AI council members (PM, ARCHITECT, BACKEND, etc.)
 * Read-only component - no user input
 */

interface CouncilMessage {
  id: string;
  role: string;
  content: string;
}

interface CouncilChatProps {
  messages: CouncilMessage[];
}

const ROLE_COLORS: Record<string, string> = {
  PM: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ARCHITECT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  BACKEND: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FRONTEND: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  QA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function CouncilChat({ messages }: CouncilChatProps) {
  return (
    <div className="space-y-4" data-testid="council-chat">
      {messages.map((message) => (
        <div
          key={message.id}
          className="rounded-lg border border-border bg-card p-4"
          data-testid="council-message"
        >
          <div className="mb-2">
            <span
              className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                ROLE_COLORS[message.role] || "bg-gray-100 text-gray-800"
              }`}
              data-testid="message-role"
            >
              {message.role}
            </span>
          </div>
          <p className="text-sm text-foreground">{message.content}</p>
        </div>
      ))}
    </div>
  );
}
