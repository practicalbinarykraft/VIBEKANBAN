# Vibe Kanban

AI Agent Orchestrator - веб-платформа для управления задачами AI-агентов с визуальным Kanban интерфейсом.

## Стек технологий

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui (Radix UI)
- **Drag & Drop**: @dnd-kit (готово к интеграции)

## Структура проекта

```
vibe-kanban/
├── app/
│   ├── layout.tsx           # Корневой layout
│   ├── page.tsx            # Редирект на /projects
│   ├── globals.css         # Глобальные стили
│   └── projects/
│       ├── page.tsx        # Список проектов
│       └── [id]/
│           └── page.tsx    # Kanban доска проекта
├── components/
│   ├── app-shell.tsx       # Основной layout с навигацией
│   ├── top-nav.tsx         # Верхняя навигация
│   ├── kanban/
│   │   ├── kanban-board.tsx    # Главная доска
│   │   ├── kanban-column.tsx   # Колонка статуса
│   │   └── task-card.tsx       # Карточка задачи
│   ├── task-details/
│   │   ├── task-details-panel.tsx  # Правая панель деталей
│   │   ├── logs-view.tsx           # Вкладка логов
│   │   └── diffs-view.tsx          # Вкладка диффов
│   ├── modals/
│   │   ├── create-task-modal.tsx   # Создание задачи
│   │   └── create-pr-modal.tsx     # Создание PR
│   └── ui/                 # shadcn/ui компоненты
├── types/
│   └── index.ts           # TypeScript типы
├── lib/
│   ├── utils.ts           # Утилиты
│   └── mock-data.ts       # Mock данные для демо
└── package.json

```

## Реализованные фичи

### ✅ Основной UI
- [x] Верхняя навигация (Projects, MCP Servers, Settings, Docs)
- [x] Страница списка проектов
- [x] Kanban доска с колонками (To Do, In Progress, In Review, Done, Cancelled)
- [x] Поиск задач
- [x] Выбор задачи с обновлением URL (?task=id)

### ✅ Task Details Panel
- [x] Отображение деталей задачи
- [x] Статус с цветовой индикацией
- [x] Attempt Summary (Started, Agent, Branch, Worktree Path, Merge Status)
- [x] Кнопки действий (Create PR, Merge, New Attempt, Stop Dev)
- [x] Копирование worktree path в буфер

### ✅ Вкладки Logs/Diffs
- [x] Вкладка Logs с форматированным выводом
- [x] Вкладка Diffs с списком файлов
- [x] Expand/Collapse для каждого файла
- [x] Expand All/Collapse All
- [x] Подсчет изменений (+additions / -deletions)
- [x] Badge с количеством измененных файлов

### ✅ Модалки
- [x] Create Task Modal (Title, Description, Cancel, Create Task, Create & Start)
- [x] Create PR Modal (Title, Description, Base Branch)

## Запуск проекта

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Запуск production сборки
npm start
```

Приложение доступно по адресу: http://localhost:3000

## Mock данные

Для демонстрации используются mock данные из `lib/mock-data.ts`:
- 1 проект (vibe-kanban)
- 4 задачи с разными статусами
- Attempts с логами и диффами для некоторых задач

## Следующие шаги (Backend)

Для полноценной работы необходимо реализовать:

1. **Backend API** (Node.js/Express или Python/FastAPI)
   - Endpoints для CRUD операций с Projects/Tasks/Attempts
   - WebSocket для real-time логов
   - Git worktree management
   - Docker runner интеграция

2. **Database** (PostgreSQL)
   - Схема: Projects, Tasks, Attempts, Artifacts, Commands
   - Миграции

3. **Docker Runner**
   - Изоляция выполнения агентов
   - Command allowlist/blocklist
   - Secret management

4. **Claude CLI Integration**
   - Запуск агентов через CLI
   - Streaming логов
   - Сбор artifacts (diffs, patches, summary)

5. **GitHub Integration**
   - Создание PR через GitHub API
   - Merge функциональность
   - Статус проверок

## Testing

UI использует **explicit refresh contract** — после мутаций UI обновляется через `refreshTasks()`, не через page reload. E2E тесты используют `waitForBoardReady()` / `waitForTaskInColumn()` вместо таймаутов. Подробнее: [docs/testing.md](docs/testing.md).

## Drag-and-Drop

@dnd-kit уже установлен, но drag-and-drop функциональность пока не активирована. Для включения необходимо обернуть KanbanBoard в DndContext и добавить сортируемые элементы.

## Лицензия

MIT
