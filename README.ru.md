# @hellpnick/context-graph

[English](./README.md) · **Русский**

CLI строит **граф маршрутизации для ИИ** из дерева репозитория: `.github/instructions/` (подсистемные `*.instructions.md`), корневая навигация и опциональные якоря под инструменты (Cursor, Copilot, Claude Code, …).

- **`build --no-llm`** — полностью офлайн: детерминированный скан, без API-ключа, удобно для CI.
- **`build` / `build --hybrid`** — при настроенных ключах LLM дополняет структуру и заметки.

## Требования

- **Node.js 18+**
- Репозиторий с **git** (опционально pre-push hook с напоминанием).

В целевом PHP / Python / Go проекте **не нужны** `tsconfig` и TypeScript в приложении: пакет публикуется как `dist/`, зависимость `typescript` нужна рантайму CLI для разбора `.ts` / `.vue`.

## Установка

```bash
npm install -D @hellpnick/context-graph
```

Первый прогон без сети:

```bash
npx context-graph build --no-llm
```

С облаком или Ollama: ключи в `.env` или интерактивный `build` без `--no-llm` (создаст `.context-graph.json`).

## Быстрый старт

```bash
cd /path/to/your-project
npx context-graph build --no-llm

# или из любой директории
npx context-graph build --no-llm /path/to/your-project
```

CI без интерактива:

```bash
export CONTEXT_GRAPH_INSTRUCTION_TARGETS=copilot,cursor
export CONTEXT_GRAPH_INSTALL_AGENTS=false
npx context-graph build --no-llm
```

## Что появляется в репозитории

| Путь | Назначение |
|------|------------|
| `.github/instructions/` | `*.instructions.md`, `index.md`, `context-graph-path-index.md`, при необходимости `metadata.json` |
| `.github/copilot-instructions.md` | Корневой граф и навигация |
| `.copilotignore` | Стандартные исключения при сборке; учитывается при **следующем** скане |
| `.context-graph.json` | Провайдер, стратегия, targets, группировка |
| `.context-graph-last-build` | Ref для diff / `actualize` (в VCS по желанию) |

**Коммитить:** `.github/instructions/`, `.github/copilot-instructions.md`, `.copilotignore`, используемые entrypoints (`.cursor/rules/`, `CLAUDE.md`, …).

**Не коммитить:** `.env`, секреты, `.context-graph-last-build` (по желанию).

## Якоря под инструменты (`instructionTargets`)

При `build` пишутся короткие **роутеры** на граф, без дублирования всего содержимого:

| Путь | Инструмент |
|------|------------|
| `CLAUDE.md` | Claude Code |
| `AGENTS.md` | Cursor / Codex / общие агенты |
| `GEMINI.md` | Gemini |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.codex/context-graph.md` | Codex |
| `.windsurf/rules/context-graph.md` | Windsurf |
| `.clinerules/context-graph.md` | Cline |

Пример `.context-graph.json`:

```json
{
  "instructionTargets": ["copilot", "cursor", "claude"],
  "installAgents": false
}
```

Или env: `CONTEXT_GRAPH_INSTRUCTION_TARGETS=copilot,cursor` (через запятую или `all`).

## Исключения из графа

Порядок при скане (правила накладываются):

1. `.gitignore`
2. `.copilotignore` (если есть)
3. **`.graph-context-ignore`** или **`.context-graph-ignore`** — только для context-graph, синтаксис как у gitignore

Пример для большого Laravel (фокус на backend):

```gitignore
resources/**
docs/**
tests/**
*.min.js
```

Встроенный **tier 3** всегда отсекает `node_modules/`, `vendor/`, lock-файлы, бинарники.

**Подсистемы:** `INSTRUCTION_EXCLUDE_RE` не создаёт отдельные instructions для README, всех `*.md`, lock-файлов и т.п. (в дереве/metadata они могут остаться).

> **Важно:** `.copilotignore` влияет на **скан context-graph** и перезаписывается при `build`. Официальное исключение контента в GitHub Copilot настраивается в настройках репозитория на GitHub, а не обязательно локальным файлом.

## Приоритет P0 / P1 / P2

Метка **срочности контекста** (не «важность бизнеса»):

| Уровень | Смысл | Примеры (`--no-llm`) |
|---------|--------|----------------------|
| **P0** | Нужен при правках зоны | `pages/*`, composables, entry CLI, API-контроллеры |
| **P1** | Часто нужен | `package.json`, stores, ядро |
| **P2** | Редко / листья | тесты, мелкие компоненты, моки |

Где живёт: frontmatter `priority:`, `metadata.json`, `context-graph-path-index.md`.

Если несколько `*.instructions.md` матчат файл — выше приоритет (P0 > P1 > P2).

## Cursor rules

При target `cursor`:

| Путь | Роль |
|------|------|
| `.cursor/rules/context-graph.mdc` | Общий роутер |
| `.cursor/rules/ctxgraph--*.mdc` | Rule на подсистему; `globs` = `applyTo` |
| `.cursor/rules/README.context-graph.md` | Пояснение |
| `.cursor/rules/.context-graph-manifest` | Список rules |

`ctxgraph--*` **не править вручную** — только `build`.

## Команды

| Команда | Действие |
|---------|----------|
| `build [dir]` | Собрать граф с нуля |
| `actualize [dir]` | Обновить по diff (`--all` — весь проект) |
| `validate [dir]` | Exit `1`, если граф устарел (CI) |
| `agents [dir]` | Скачать рекомендуемых агентов в `.github/agents/` |
| `review [dir]` | Отчёт LLM без перезаписи |
| `impact <file> [dir]` | LLM: что затронет изменение файла |
| `hook-check [dir]` | Вызов из git pre-push |

### Флаги `build`

| Флаг | Эффект |
|------|--------|
| `--no-llm` | Только детерминированная генерация |
| `--hybrid` | Каркас + LLM-заметки на части подсистем |
| `--provider` / `--model` | Разовое переопределение |
| `--subsystem-grouping default\|by-folder` | Один instruction на каталог |
| `--subsystem-layout mirror\|canonical` | Раскладка путей в `.github/instructions/` |
| `--dry-run` | Список файлов без записи |
| `--no-hook` | Не ставить pre-push hook |
| `--json` / `--quiet` | JSON / тихий режим |

## Стратегии сборки

| Стратегия | Как включить | Поведение |
|-----------|--------------|-----------|
| **deterministic** | `--no-llm` или `"buildStrategy": "deterministic"` | Скан + эвристики + PHP/Laravel routing; без сети |
| **hybrid** | `--hybrid` или `"buildStrategy": "hybrid"` | Детерминированные файлы + LLM-заметки |
| **llm** | по умолчанию при ключе | Полный LLM-план |

**Крупный PHP / Laravel:** авто **`by-folder`**, если есть `artisan` и `composer.json` (не плодит instruction на каждый файл в `app/`).

**Slim root:** компактный `copilot-instructions.md` при ≥40 подсистемах или ≥80 исходниках (или при `contextDepth: "slim"`).

## Провайдеры

| `provider` | Когда |
|------------|--------|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `ollama` | Локально, `ollama serve` + модель |
| `openai-compat` | Свой `baseUrl` + `apiKeyEnv` |

**Приоритет:** CLI → `CONTEXT_GRAPH_*` → `.context-graph.json` → defaults.

### Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `CONTEXT_GRAPH_ROOT` | Корень проекта, если cwd не репо |
| `CONTEXT_GRAPH_PROVIDER` | `openai` \| `anthropic` \| `ollama` \| `openai-compat` |
| `CONTEXT_GRAPH_MODEL` | Ид модели |
| `CONTEXT_GRAPH_BASE_URL` | Base URL OpenAI-совместимого API |
| `CONTEXT_GRAPH_BUILD_STRATEGY` | `deterministic` \| `hybrid` \| `llm` |
| `CONTEXT_GRAPH_CONTEXT_DEPTH` | `slim` \| `full` |
| `CONTEXT_GRAPH_MAX_FILES` | Лимит файлов скана (по умолчанию 200) |
| `CONTEXT_GRAPH_MAX_INPUT_TOKENS` | Бюджет токенов (по умолчанию 80000) |
| `CONTEXT_GRAPH_INSTRUCTION_TARGETS` | `copilot,cursor` или `all` |
| `CONTEXT_GRAPH_INSTALL_AGENTS` | `true` \| `false` |
| `CONTEXT_GRAPH_SUBSYSTEM_GROUPING` | `default` \| `by-folder` |
| `CONTEXT_GRAPH_SUBSYSTEM_LAYOUT` | `mirror` \| `canonical` |
| `CONTEXT_GRAPH_HYBRID_MAX_SUBSYSTEMS` | Число подсистем с LLM в hybrid |
| `CONTEXT_GRAPH_OUTPUT_STYLE` | `normal` \| `compact` |

### Пример `.context-graph.json`

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "buildStrategy": "deterministic",
  "contextDepth": "full",
  "subsystemGrouping": "by-folder",
  "instructionTargets": ["copilot", "cursor", "agents"],
  "installAgents": false,
  "maxFiles": 300,
  "maxInputTokens": 120000
}
```

## Pre-push hook

После `build` (без `--no-hook`) в `.git/hooks/pre-push` — напоминание, если много значимых файлов изменилось с последней сборки. По умолчанию **N** — push **не блокируется**. В CI / без TTY тихо.

Отключить разово: `git push --no-verify`. Навсегда: удалить или отредактировать hook.

## Скан: tier'ы

| Tier | Обработка |
|------|-----------|
| **0** | CI, Docker, makefile — целиком (в бюджете) |
| **1** | Entrypoints и манифесты — целиком |
| **2** | Код — **поверхность** (~30 строк; больше для composables, Vue script, `.py`/`.go`) |
| **3** | Пропуск — `node_modules`, `vendor`, locks, картинки, minified |

В режиме `--no-llm` для **Python** (`.py`), **Go** (`.go`) и **C#** (`.cs`) строятся signatures и подсказки по импортам/`using` без LLM; для C# дополнительно — runtime-эвристики ASP.NET (контроллеры, HTTP, EF Core).

## Программный API

```ts
import { scanProject, buildGraph, writeOutputFiles, loadConfig } from '@hellpnick/context-graph';

const config = loadConfig(process.cwd());
const scan = await scanProject(process.cwd(), config.maxFiles, config.maxInputTokens);
const { files } = await buildGraph(scan, config, 'BUILD');
writeOutputFiles(files, process.cwd());
```

## Python-обёртка

См. [`python/README.md`](./python/README.md). Нужен **Node 18+** под капотом.

## Разработка пакета

```bash
git clone git@github.com:hellhellpnick/context-graph.git
cd context-graph
npm install
npm run build
npm test
npm link
```

## Ссылки

- [graph-create-agent.md](./graph-create-agent.md) — системный промпт LLM-проходов
- [Copilot: custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)

## Лицензия

MIT
