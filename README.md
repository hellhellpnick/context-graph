# @hellpnick/context-graph

CLI генерирует набор файлов **`.github/instructions/`** и **`.github/copilot-instructions.md`** из дерева репозитория — для Copilot / Cursor и похожих режимов.

- **`build --no-llm`** — без сети и без API-ключа, только статический разбор (удобно как база и для CI).
- **`build` / `actualize` / `hybrid`** — при наличии ключа и провайдера текст и структура дополняются через LLM.

## Требования

- **Node.js 18+**
- Репозиторий с **git** (корень проекта и опциональный pre-push hook).

В вашем PHP / Python / Go проекте **не нужны** `tsconfig`, TypeScript в приложении и т.п.: публикуется уже собранный `dist/`, а пакет **`typescript`** тянется как обычная **зависимость** этого CLI (нужен рантайму для разбора `.ts`/`.vue` и т.д.).

## Установка

```bash
npm install -D @hellpnick/context-graph
```

Первый прогон без LLM:

```bash
npx context-graph build --no-llm
```

Дальше — с облаком или Ollama: положи ключи в `.env` или создай `.context-graph.json` при первом интерактивном `build` без `--no-llm`.

## Что появляется в репозитории

| Путь | Назначение |
|------|------------|
| `.github/instructions/` | Подсистемные `*.instructions.md`, `index.md`, при необходимости `metadata.json` |
| `.github/copilot-instructions.md` | Корневой граф и навигация |
| `.copilotignore` | Подсказка по исключениям для сканирования |
| `.context-graph.json` | Конфиг (создаётся при первом интерактивном запуске) |
| `.context-graph-last-build` | Ref последней сборки для diff (не обязателен в VCS) |

**Имеет смысл коммитить:** `.github/instructions/`, `.github/copilot-instructions.md`, `.copilotignore`, при использовании Cursor — свой rule под граф, если завёл.

**Не коммитить:** `.env`, секреты, `.context-graph-last-build` (по желанию).

## Init-файлы (якоря для агентов)

При `build` / `build --no-llm` CLI дополнительно пишет короткие **роутеры** — они указывают на `.github/instructions/`, а не дублируют весь граф:

| Путь | Инструмент |
|------|------------|
| `CLAUDE.md` | Claude Code |
| `AGENTS.md` | Cursor / Codex / общие агенты |
| `GEMINI.md` | Gemini |
| `.github/copilot-instructions.md` | GitHub Copilot (корень) |
| `.codex/context-graph.md` | Codex |
| `.windsurf/rules/context-graph.md` | Windsurf |
| `.clinerules/context-graph.md` | Cline |

Содержимое: «читай `copilot-instructions.md` → `index.md` → подсистему по `applyTo`».

## Приоритет P0 / P1 / P2

Метка **срочности контекста** (не «важность бизнеса»):

| Уровень | Смысл | Примеры эвристик (`--no-llm`) |
|---------|--------|-------------------------------|
| **P0** | Всегда нужен при правках зоны | `pages/*`, composables, `src/index.ts`, entry CLI |
| **P1** | Часто нужен | `package.json`, `src/graph-builder/**`, stores, крупные Vue |
| **P2** | Редко / листья | тесты, prompt-модули, мелкие компоненты |

Где живёт:

- frontmatter `priority:` в каждом `*.instructions.md`;
- `metadata.json` → `files.<path>.priority` (per-file);
- `context-graph-path-index.md` — колонка **P**.

Источник при `--no-llm`: `inferFilePriority` / `inferSubsystemPriority` (`src/graph-builder/plan/priority.ts`). При LLM/hybrid план может задать приоритеты в JSON; gap-fill и metadata подхватывают эвристики для пропусков.

**Роутинг:** если несколько `*.instructions.md` матчат файл — предпочитай **выше** приоритет (P0 > P1 > P2). То же в `AGENTS.md` / `.codex/context-graph.md`.

## Cursor rules

Для **Cursor** (`build --no-llm` и hybrid) генерируются:

| Путь | Роль |
|------|------|
| `.cursor/rules/context-graph.mdc` | Общий роутер (всегда включён) |
| `.cursor/rules/ctxgraph--*.mdc` | По одному rule на подсистему; `globs` = `applyTo` из плана |
| `.cursor/rules/README.context-graph.md` | Пояснение |
| `.cursor/rules/.context-graph-manifest` | Список сгенерированных rules |

При открытии файла Cursor подцепляет rule с подходящим glob — **без** ручного «прочитай instructions».

Источник правды: `.github/instructions/*.instructions.md`. Файлы `ctxgraph--*` **не править вручную** — перезапишутся на следующем `build`.

```bash
context-graph build --no-llm
```

Copilot / Claude без Cursor по-прежнему опираются на корневой граф и `applyTo` в instructions; auto-attach по glob — особенность Cursor.

## Команды

| Команда | Действие |
|---------|----------|
| `build [dir]` | Собрать граф с нуля |
| `actualize [dir]` | Обновить существующий граф (по умолчанию по diff с last-build; `--all` — весь проект) |
| `validate [dir]` | Exit `1`, если граф устарел относительно last-build (для CI) |
| `review [dir]` | Отчёт LLM по качеству графа, файлы не перезаписывает |
| `impact <file> [dir]` | LLM: что затронет изменение файла |
| `hook-check [dir]` | Внутренняя: вызывается из git pre-push |

Полезные флаги `build`:

- `--no-llm` — только детерминированная генерация.
- `--provider` / `--model` — переопределить провайдера и модель на один запуск.
- `--no-hook` — не ставить pre-push hook.

## Провайдеры

| `provider` | Когда |
|------------|--------|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `ollama` | Локально, отдельного секрета нет, нужен `ollama serve` и модель |
| `openai-compat` | Любой OpenAI-совместимый `baseUrl` + ключ из `apiKeyEnv` |

Приоритет настроек: **аргументы CLI** → **переменные окружения** (`CONTEXT_GRAPH_*` и ключи) → **`.context-graph.json`** → значения по умолчанию.

Переменные с префиксом `CONTEXT_GRAPH_` см. в `src/config.ts` или сгенерируй конфиг интерактивно один раз.

## Контекст в промпте: `slim` и `full`

- **`full`** — в LLM уходит больше текста из скана.
- **`slim`** — тела файлов урезаются по строкам; для `ollama` по умолчанию включён `slim`, чтобы не раздувать вход.

Поле в JSON: `"contextDepth": "slim"` или `"full"`, либо `CONTEXT_GRAPH_CONTEXT_DEPTH`.

## Pre-push hook

После `build` (если не `--no-hook`) в `.git/hooks/pre-push` добавляется напоминание: много ли значимых файлов изменилось с последней сборки. Ответ **N** по умолчанию, push **не блокируется**. В CI / без TTY лишнего шума нет.

Отключить один раз: `git push --no-verify`. Навсегда: удалить или отредактировать hook.

## Как устроен скан

Файлам задаётся tier; tier **3** (lock-файлы, бинарники, `node_modules`, …) не читается.

- **0** — CI, Docker, makefile-уровень: целиком в контексте.
- **1** — entrypoints и корневые манифесты (`package.json`, `composer.json`, `go.mod`, `pyproject.toml`, `artisan`, …): целиком (с ограничением по бюджету токенов).
- **2** — остальной код: не весь файл, а **поверхность** (например 30 строк по умолчанию; для composables, Vue `<script>`, `.py`/`.go` — больше, см. `scanner.ts`).
- Экспорты/импорты для детерминированного режима вытаскиваются эвристиками и через `typescript` там, где это уместно (в т.ч. из Vue SFC).

Лимиты по умолчанию: порядка **200 файлов** и **80k** условных токенов на скан — настраиваются в конфиге.

## Программный API

```ts
import { scanProject, buildGraph, writeOutputFiles, loadConfig } from '@hellpnick/context-graph';

const config = loadConfig(process.cwd());
const scan = await scanProject(process.cwd(), config.maxFiles, config.maxInputTokens);
const { files } = await buildGraph(scan, config, 'BUILD');
writeOutputFiles(files, process.cwd());
```

## Python-обёртка

В каталоге `python/` лежит обёртка с entrypoint `context-graph` (см. `python/pyproject.toml`). На PyPI пакет может называться иначе — ориентируйся на фактическое имя публикации; под капотом всё равно нужен **Node 18+**.

## Разработка этого репозитория

```bash
git clone https://github.com/hellhellpnick/context-graph.git
cd context-graph
npm install
npm run build
npm test
npm link   # опционально: тест в другом проекте
```

## Ссылки

- [graph-create-agent.md](./graph-create-agent.md) — системный промпт для LLM-проходов.
- [Документация Copilot: custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)

## Лицензия

MIT
