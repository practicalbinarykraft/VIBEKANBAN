# АУДИТ AUTOPILOT / EXECUTION

**Дата:** 2026-01-20
**Статус:** Завершён

---

## A) Реальное выполнение задач (Execution pipeline)

### A1. Attempts

1. **Где создаётся attempt?**
   - `server/services/execute-plan/attempt-helpers.ts` → `createAttemptForTask()` (line 21-100)
   - `app/api/tasks/[id]/run/route.ts` → POST handler (line 49-129)

2. **Persisted?**
   - ДА, таблица `attempts` в `server/db/schema.ts` (line 35-59)

3. **Статусы:**
   - `pending` → `queued` → `running` → `completed` | `failed` | `stopped`

4. **Привязка:**
   - `taskId` → foreign key к `tasks`
   - Нет прямой связи с project (через task)
   - Нет связи с autopilot session

---

### A2. Worktree

5. **Создаётся ли worktree?**
   - ДА

6. **Где?**
   - `server/services/execute-plan/attempt-helpers.ts` → `createAttemptForTask()` (line 50-53)
   - Команда: `git worktree add -B "${branchName}" "${workspacePath}" ${defaultBranch}`

7. **Удаляется после завершения?**
   - НЕТ. Cleanup не реализован. Worktrees накапливаются на диске.

8. **Конфликт параллельных attempts?**
   - НЕТ — каждый attempt получает уникальный `workspacePath` и `branchName`

---

### A3. Запуск Claude Code

9. **Реально запускается CLI?**
   - ДА, условно: `server/services/attempt-runner.ts` (line 99-100)
   - Условие: `useClaude = !!anthropicApiKey && !isTestMode`
   - `isTestMode = process.env.PLAYWRIGHT === "1"`

10. **Команда:**
    - Real: `npx -y @anthropic-ai/claude-code "{taskTitle}"`
    - Mock: `echo "WARNING: ANTHROPIC_API_KEY not set"`

11. **ANTHROPIC_API_KEY:**
    - `server/services/attempt-runner.ts` (line 135)
    - Передаётся в Docker container через env

12. **Budget guard:**
    - КОД ЕСТЬ: `server/services/ai/ai-budget-guard.ts` → `checkProviderBudget()`
    - НЕ ИНТЕГРИРОВАН в attempt execution — не вызывается

13. **Timeout / non-zero / crash:**
    - Timeout: `Promise.race()` в `attempt-executor.ts` (line 42-45) → status `failed`, exitCode 124
    - Non-zero: status `failed`, exitCode сохраняется
    - Crash: try/catch → status `failed`, error artifact

---

### A4. Execution flow

14. **Единый orchestration flow?**
    - ДА, два варианта:
      - Docker: `server/services/attempt-runner.ts` → `runAttempt()` (line 54-329)
      - Local: `server/services/execution/simple-runner.ts` → `runSimpleAttempt()` (line 40-144)

15. **Где описано?**
    - `attempt-runner.ts` — полный цикл create → run → logs → commit → PR → finalize

16. **Retry / Cancel?**
    - Retry: ДА, `autopilot-runner.service.ts` → `retryRun()` (line 112-131)
    - Cancel: ЧАСТИЧНО — только queued, running attempts НЕ останавливаются

---

### A5. Logs & artifacts

17. **Где stdout/stderr?**
    - EventEmitter: `runner.on("log", ...)` → realtime
    - SSE: `app/api/attempts/[id]/stream/route.ts`

18. **Persisted?**
    - ДА, таблица `logs` (`server/db/schema.ts`, line 61-67)
    - `AttemptLogSink.append()` → DB insert

19. **Просмотр логов из UI?**
    - ДА:
      - `components/autopilot/attempt-logs-viewer.tsx`
      - `components/autopilot/attempt-details-panel.tsx`

20. **Артефакты:**
    - Таблица `artifacts` с типами: `log`, `diff`, `patch`, `summary`, `error`, `runner_output`

---

### A6. Result

21. **Что считается результатом?**
    - `ExecutionResult` объект: `{ok, branchName, changedFiles, diffSummary, commitSha, prUrl, logs, error}`

22. **Автоматическое создание PR?**
    - ДА, при успешном завершении: `attempt-runner.ts` (line 193-206)
    - Также manual: `app/api/attempts/[id]/create-pr/route.ts`

23. **Где реализовано?**
    - `server/services/execution/pr-creator.ts` → `createPullRequest()`
    - Использует `gh pr create` CLI

24. **Если результата нет?**
    - EMPTY_DIFF: status `failed`, error "Agent produced no code changes"
    - Пользователь видит badge "failed" и сообщение об ошибке

---

## B) UX-цикл Autopilot

### B1. Start / Stop

25. **Кнопка Start Autopilot:**
    - Компонент `AutopilotPanel` СУЩЕСТВУЕТ (`components/planning/autopilot-panel.tsx`)
    - Но НИКУДА НЕ ПОДКЛЮЧЁН — 0 импортов в UI
    - Код вызова: `useAutopilot.start()` → `POST /api/projects/{id}/planning/autopilot/start`

26. **Кнопка Stop:**
    - Останавливает только state machine (status → IDLE)
    - Запущенные task executions ПРОДОЛЖАЮТ РАБОТАТЬ

---

### B2. Status

27. **Откуда UI берёт статус?**
    - Polling каждые 2 секунды: `useAutopilot.ts` (line 112-149)
    - `GET /api/projects/{id}/planning/autopilot/status`
    - Нет WebSocket

28. **Статус derived или вручную?**
    - Derived из state machine
    - Но может рассинхронизироваться с реальным execution

---

### B3. History

29. **Список прошлых прогонов?**
    - НЕТ таблицы autopilot_runs
    - НЕТ истории autopilot sessions
    - Есть только `runs` по project в `run-history.service.ts` — но это НЕ autopilot runs

30. **Открыть attempt, увидеть логи/ошибки?**
    - ДА для task attempts — через task details
    - НЕТ связи autopilot session → attempts

---

### B4. Errors

31. **Типы ошибок:**
    - String-based, не enum
    - Коды: `OPEN_PR_LIMIT`, `FILES_LIMIT`, `REPO_NOT_READY`, `AI_NOT_CONFIGURED`, `EMPTY_DIFF`, `GIT_ERROR`

32. **Где видит пользователь?**
    - В `AutopilotPanel` (line 124-128) — но панель не подключена к UI
    - Фактически: НИГДЕ

33. **Retry / guidance?**
    - Retry кнопка есть в компоненте
    - Guidance: НЕТ — только сырой текст ошибки

---

## C) Границы готовности

34. **Можно ли прямо сейчас без костылей выполнить полный цикл?**
    - **НЕТ**

35. **Где ломается цепочка:**
    1. `AutopilotPanel` не подключён к UI — нет кнопки Start
    2. `useAutopilot` hook не используется
    3. Статус/прогресс не отображается
    4. История не существует
    5. Ошибки невидимы

---

## D) Технические долги

36. **Что mock / заглушка / не подключено:**

| Компонент | Статус |
|-----------|--------|
| `AutopilotPanel` | ✅ Код есть, ❌ не подключён к UI |
| `useAutopilot` | ✅ Код есть, ❌ не используется |
| Budget guard | ✅ Код есть, ❌ не вызывается |
| Worktree cleanup | ❌ Не реализован |
| Cancel running attempts | ❌ Не работает |
| Autopilot history | ❌ Не реализован |
| Error guidance | ❌ Не реализован |

37. **Что не production-ready:**
    - Весь autopilot UI flow — код есть, интеграция нулевая
    - Budget guard — не защищает от перерасхода
    - Worktree cleanup — утечка диска
    - Running task cancellation — не работает
    - Error visibility — ошибки невидимы пользователю
    - Autopilot history — невозможно понять что было раньше

---

## ИТОГ

| Область | Готовность | Комментарий |
|---------|------------|-------------|
| Execution pipeline (A) | ~70% | Работает через API |
| Autopilot UX (B) | 0% | Код написан, не подключён к UI |
| End-to-end flow (C) | НЕТ | Цепочка разорвана |
| Production readiness | НЕТ | Критические gap'ы |

---

## Следующие шаги

На основе этого аудита необходимо составить план PR для:
1. Подключения AutopilotPanel к UI
2. Интеграции budget guard в execution
3. Реализации worktree cleanup
4. Добавления autopilot history
5. Реализации cancel для running attempts
6. Добавления error guidance
