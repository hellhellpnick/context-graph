# context-graph

**Автоматическая генерация графов контекста для любого кодбейса. Одна команда, zero config.**

Превращает проект в `.github/instructions/` для GitHub Copilot.

- Работает **без LLM** (детерминированный скелет: оффлайн, ноль токенов).
- Опционально использует LLM (LLM / hybrid) для “прозы” и уточнений.

---

## 🚀 Быстрый старт

### Оффлайн (без LLM) — рекомендуемый базовый режим

```bash
npm install -D context-graph
npx context-graph build --no-llm
```

Получишь:

- `.github/instructions/**` (root + index + подсистемы)
- `.github/copilot-instructions.md`
- `.copilotignore`

### Что коммитить

- Коммить: `.github/instructions/**`, `.github/copilot-instructions.md`, `.copilotignore`, `.cursor/rules/context-graph.mdc` (если используешь Cursor rules).
- Не коммить: `.env`, `.context-graph-last-build` (временная ref-точка для diff).

### Локально: Ollama (без API-ключа)

У [Ollama](https://ollama.com) **нет отдельного секрета**: достаточно запущенного `ollama serve` и скачанной модели.

```bash
ollama pull llama3.2   # или другая модель из .context-graph.json

npm install -D context-graph
```

Создай `.context-graph.json` (или скопируй из этого репозитория):

```json
{
  "provider": "ollama",
  "model": "llama3.2",
  "baseUrl": "http://127.0.0.1:11434/v1",
  "maxFiles": 200,
  "maxInputTokens": 80000
}
```

```bash
npx context-graph build
```

Другой хост/порт: `CONTEXT_GRAPH_BASE_URL=http://192.168.1.10:11434/v1` или поле `baseUrl` в JSON.

---

### Вариант 1: Облако через `.env` (OpenAI / Anthropic)

```bash
npm install -D context-graph
```

Создай файл `.env` в корне проекта (вручную или через терминал):

```
OPENAI_API_KEY=sk-...
CONTEXT_GRAPH_PROVIDER=openai
CONTEXT_GRAPH_MODEL=gpt-4o
```

```bash
npx context-graph build
```

**Переключить провайдера?** Отредактируй `.env`:

```bash
# Сменить на Claude
echo "CONTEXT_GRAPH_PROVIDER=anthropic" >> .env
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
npx context-graph actualize
```

---

### Вариант 2: Интерактивный выбор

```bash
npm install -D context-graph
# Для облака положи ключ в .env; для Ollama ключ не нужен
npx context-graph build
```

При первом запуске появится выбор:

```
📋 Configure context-graph:

? Select LLM provider: (Use arrow keys)
❯ OpenAI (gpt-4o, o1, o3-mini)  [OPENAI_API_KEY]
  Anthropic (claude-opus-4, claude-sonnet-4-5)  [ANTHROPIC_API_KEY]
  Ollama (local, http://127.0.0.1:11434/v1)  [no key · ollama pull llama3.2]
  OpenAI-compatible (Together, DeepSeek, LM Studio, …)  [OPENAI_API_KEY + baseUrl]

? Model name (leave empty for default):
```

---

### Вариант 3: CLI флаги

```bash
npm install -D context-graph
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npx context-graph build --provider anthropic --model claude-sonnet-4-5

# Ollama без .env с ключом
npx context-graph build --provider ollama --model llama3.2
```

---

### Python (pip)

```bash
pip install context-graph
export ANTHROPIC_API_KEY=sk-ant-...       # Linux/macOS
# set ANTHROPIC_API_KEY=sk-ant-...        # Windows cmd
# $env:ANTHROPIC_API_KEY="sk-ant-..."     # PowerShell
context-graph build
```

---

## ✨ Что происходит

При запуске `npx context-graph build` (LLM режим):

```
Using openai/gpt-4o (from .env)
Scanning project files... ✔ Scanned 147 files (~65k tokens)
Generating context graph with gpt-4o... ✔ Graph generated (8 files)
  + .github/instructions/copilot-instructions.md
  + .github/instructions/graph-changelog.md
  + .github/instructions/index.md
  ...

✓ Installed git pre-push hook
✓ Context graph built: 8 files in .github/instructions/
```

**Процесс:**

1. **Показывает конфигурацию:** откуда берется провайдер (`.env` / `.context-graph.json` / CLI флаги)
2. **Сканирует проект:** анализирует файлы по tier-системе (инфра → entry points → core → rest)
3. **Мультипасс в LLM** (OpenAI / Anthropic / **ollama** / OpenAI-compatible): план покрытия → корневые файлы → по одному проходу на подсистему; план **дополняется кодом**, чтобы каждый отсканированный путь попал в граф
4. **Пишет артефакты:** `.github/instructions/*.instructions.md` и корневые файлы, в том числе:
   - Dependency graphs (Mermaid)
   - Data flow diagrams
   - Danger zones & init order
   - Module contracts & conventions
5. **Ставит git hook:** при `git push` — **мягкое напоминание** и опциональный запуск `actualize` (по умолчанию «нет», пуш не блокируется)

**Оффлайн режим (`--no-llm`):**

- Сканирует проект.
- Строит план покрытия детерминированно.
- Генерит root + подсистемы без сети и без LLM.

---

## 📦 Команды

В этом репозитории после `npm run build` удобны обёртки:

| npm-скрипт            | Эквивалент                    |
| --------------------- | ----------------------------- |
| `npm run graph:build`   | `node dist/cli.js build`      |
| `npm run graph:actualize` | `node dist/cli.js actualize` |
| `npm run graph:validate`  | `node dist/cli.js validate`   |
| `npm run context-graph -- …` | любая подкоманда CLI       |

### `build` — создать граф с нуля

```bash
npx context-graph build [dir]

# Опции:
--provider openai|anthropic|openai-compat|ollama   # Переопределить провайдера
--model gpt-4o                                    # Переопределить модель
--no-llm                                          # Оффлайн детерминированная генерация (без LLM)
--no-hook                                         # Не ставить git pre-push hook
```

**Что создает:**

```
.github/instructions/
  copilot-instructions.md    ← корневой граф
  graph-changelog.md         ← история изменений
  index.md                   ← навигация
  metadata.json              ← метрики файлов
  core/*.instructions.md     ← подсистемы
  infra/*.instructions.md
.context-graph.json          ← конфиг (создается интерактивно)
.context-graph-last-build    ← timestamp для diff
.git/hooks/pre-push          ← хук для автоактуализации
```

---

### `actualize` — обновить граф после изменений

```bash
npx context-graph actualize [dir]

# Опции:
--all    # Пересканировать весь проект (по умолчанию — только измененные файлы)
```

**Когда запускать:**

- Вручную: `npm run graph:actualize` или `npx context-graph actualize`
- После `git push`: хук покажет напоминание; **опционально** согласиться на actualize в интерактивном терминале

---

### `review` — проверить актуальность графа

```bash
npx context-graph review [dir]
```

Не меняет файлы — выводит отчет LLM о точности существующего графа (требует LLM).

---

### `impact` — анализ blast radius изменений

```bash
npx context-graph impact src/core/state.ts [dir]
```

Показывает (требует LLM):

- Какие модули зависят от указанного файла
- Транзитивные зависимости (1 уровень)
- Danger zones, которые будут затронуты
- Покрытие тестами

---

## ⚙️ Конфигурация

При первом `build` создается `.context-graph.json` **интерактивно** (если файла ещё нет).

Пример для **OpenAI**:

```json
{
	"provider": "openai",
	"model": "gpt-4o",
	"apiKeyEnv": "OPENAI_API_KEY",
	"maxFiles": 200,
	"maxInputTokens": 80000
}
```

Для **Ollama** поле `apiKeyEnv` **не нужно** (локально секрета нет; внутри CLI подставляется совместимый с OpenAI SDK плейсхолдер).

### `contextDepth`: `slim` vs `full`

- **`full`** — в промпты уходит полный текст отсканированных файлов; корневой проход просит **5** файлов у LLM (включая `index.md` / `metadata.json`, которые потом всё равно можно перезаписать детерминированно).
- **`slim`** (по умолчанию для **`ollama`**): тела файлов **обрезаются по числу строк** (tier 0 / 1 / 2), в корневом проходе у модели запрашиваются только **3** файла (`copilot-instructions`, `graph-changelog`, `.copilotignore`); **`index.md` и `metadata.json`** собираются кодом из полного скана — меньше токенов на вход и на выход, удобнее для 8 ГБ VRAM. Экспорты для подсистем по-прежнему берутся из **полного** скана.

Переключение: `CONTEXT_GRAPH_CONTEXT_DEPTH=full` или в JSON `"contextDepth": "full"`.

**Поддерживаемые провайдеры:**

| Provider        | Модели                                   | API key                         | Примечание                          |
| --------------- | ---------------------------------------- | ------------------------------- | ----------------------------------- |
| `openai`        | `gpt-4o`, `o1`, `o3-mini`, …             | `OPENAI_API_KEY`                | облако                              |
| `anthropic`     | `claude-opus-4`, `claude-sonnet-4-5`, …  | `ANTHROPIC_API_KEY`             | облако                              |
| `ollama`        | любая модель из `ollama list`            | не требуется                    | по умолчанию `http://127.0.0.1:11434/v1` |
| `openai-compat` | любой OpenAI-совместимый endpoint        | задаётся `apiKeyEnv` + `baseUrl` | Together, DeepSeek, LM Studio, …    |

---

### Конфигурация через ENV-переменные (рекомендуется)

**Приоритет:** CLI флаги > ENV переменные > `.context-graph.json` > defaults

Можно управлять всеми настройками через `.env` **без создания** `.context-graph.json`:

```bash
# .env
OPENAI_API_KEY=sk-...

# Переключить провайдера/модель:
CONTEXT_GRAPH_PROVIDER=anthropic
CONTEXT_GRAPH_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=sk-ant-...

# Для OpenAI-compatible провайдеров:
CONTEXT_GRAPH_PROVIDER=openai-compat
CONTEXT_GRAPH_MODEL=qwen2.5-coder:32b
CONTEXT_GRAPH_BASE_URL=http://localhost:11434/v1

# Лимиты (опционально):
CONTEXT_GRAPH_MAX_FILES=200
CONTEXT_GRAPH_MAX_INPUT_TOKENS=80000

# Укороченные промпты для локальных моделей (по умолчанию уже включено для provider=ollama):
CONTEXT_GRAPH_CONTEXT_DEPTH=slim   # slim | full
```

**Теперь можно менять провайдера на лету:**

```bash
# День 1: используй OpenAI
echo "CONTEXT_GRAPH_PROVIDER=openai" >> .env
npx context-graph build

# День 2: переключись на Claude
sed -i 's/openai/anthropic/' .env
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
npx context-graph actualize

# День 3: локальный Ollama (нативный провайдер)
echo "CONTEXT_GRAPH_PROVIDER=ollama" >> .env
echo "CONTEXT_GRAPH_MODEL=llama3.2" >> .env
# при необходимости: CONTEXT_GRAPH_BASE_URL=http://127.0.0.1:11434/v1
npx context-graph actualize
```

**Преимущества ENV-конфигурации:**

- ✅ Не нужно создавать `.context-graph.json`
- ✅ Можно менять провайдера без редактирования файлов
- ✅ Удобно для CI/CD (разные ключи для разных окружений)
- ✅ `.env` в `.gitignore` — ключи не коммитятся

---

### Конфигурация через файл `.context-graph.json` (альтернатива)

Если ENV-переменные не установлены, используется файл конфигурации.

### Пример: Anthropic Claude

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npx context-graph build --provider anthropic --model claude-sonnet-4-5
```

Или создай `.context-graph.json` вручную:

```json
{
	"provider": "anthropic",
	"model": "claude-sonnet-4-5",
	"apiKeyEnv": "ANTHROPIC_API_KEY"
}
```

---

### Пример: Ollama (локально, рекомендуется)

```json
{
	"provider": "ollama",
	"model": "llama3.2",
	"baseUrl": "http://127.0.0.1:11434/v1",
	"maxFiles": 200,
	"maxInputTokens": 80000
}
```

```bash
ollama pull llama3.2
npx context-graph build
```

Альтернатива — провайдер **`openai-compat`** с тем же `baseUrl` и любым значением в `OPENAI_API_KEY`, если так удобнее единообразно с другими endpoint’ами.

---

### Пример: DeepSeek

```json
{
	"provider": "openai-compat",
	"model": "deepseek-v3",
	"apiKeyEnv": "DEEPSEEK_API_KEY",
	"baseUrl": "https://api.deepseek.com/v1"
}
```

```bash
echo "DEEPSEEK_API_KEY=sk-..." > .env
npx context-graph build
```

---

## 🪝 Git Pre-Push Hook

После первого `build` автоматически ставится хук в `.git/hooks/pre-push`:

```bash
$ git push

⚡ Context graph: 5 significant file(s) changed since last `context-graph build`:
  src/api/router.ts
  ...

  Reminder (non-blocking): run npm run graph:actualize or context-graph actualize …

? Run actualize now (optional — uses your configured LLM)? (y/N)
```

- **`N` по умолчанию** — пуш продолжается без вызова LLM
- **`y`** — запускает `actualize`, затем пуш
- **Неинтерактивный push** (CI, некоторые GUI) — краткое напоминание в лог, **пуш не блокируется**

**Отключить хук:**

```bash
# Разово
git push --no-verify

# Навсегда
rm .git/hooks/pre-push
```

---

## 🐍 Python-обертка

```bash
pip install context-graph
export OPENAI_API_KEY=sk-...
context-graph build
```

Требует **Node.js >=18** (использует `npx context-graph` под капотом).

---

## 🧠 Как это работает

### Tier-система сканирования

| Tier  | Что                                                    | Сколько читает                      |
| ----- | ------------------------------------------------------ | ----------------------------------- |
| **0** | CI/CD, Docker, Makefile, env schema                    | полностью                           |
| **1** | Entry points, `package.json`, schema files, API routes | полностью                           |
| **2** | Остальной код                                          | первые 30 строк (imports + exports) |
| **3** | `node_modules`, lock-файлы, картинки                   | пропускает                          |

**Budget:** до 200 файлов и 80k токенов на один запрос к LLM.

### Fallback-парсинг форматов LLM

Поддерживает 4 формата вывода:

1. **Primary:** `<<<FILE: path>>>\ncontent\n<<<EOF>>>`
2. **HTML comments:** `<!-- FILE: path -->\n\`\`\`...\`\`\``
3. **Markdown headers:** `## FILE: path\n\`\`\`...\`\`\``
4. **Code blocks:** ` ```path/to/file.md\ncontent\n``` `

Если LLM использует нестандартный формат — сырой ответ сохраняется в `.context-graph-debug.txt`.

---

## 📚 Programmatic API

```typescript
import {
  scanProject,
  buildGraph,
  writeOutputFiles,
  initConfigInteractive,
  loadConfig,
} from 'context-graph';

// Интерактивный выбор провайдера
await initConfigInteractive(process.cwd());

// Или программный
const config = loadConfig(process.cwd());

const scan = await scanProject('/path/to/project', 200, 80000);
const { files, rawResponse } = await buildGraph(scan, config, 'BUILD');
const result = writeOutputFiles(files, '/path/to/project');

console.log(`Created ${result.created.length} files`);
```

**Типы:** все экспортировано из `'context-graph'`.

См. [EXAMPLES.md](./EXAMPLES.md) для больших примеров.

---

## 🛠 Development

```bash
# Склонировать репо
git clone https://github.com/your-username/context-graph.git
cd context-graph

# Установить зависимости
npm install

# Собрать CLI (tsc + копирование промпта)
npm run build

# Сгенерировать граф этого репозитория (нужен запущенный Ollama, см. .context-graph.json)
ollama pull llama3.2
npm run graph:build

# Или с облаком: отредактируй .context-graph.json / .env и:
# npx context-graph build

# Тестировать пакет в другом проекте
npm link
cd /path/to/test-project
npm link context-graph
npx context-graph build
```

---

## 📄 Лицензия

MIT

---

## 🔗 Ссылки

- **Промпт-агент:** [graph-create-agent.md](./graph-create-agent.md) — полная инструкция для LLM
- **Provider Setup Guide:** [PROVIDERS.md](./PROVIDERS.md) — детальное сравнение OpenAI / Claude / Ollama /
  DeepSeek
- **Examples:** [EXAMPLES.md](./EXAMPLES.md) — примеры использования CLI и API
- **GitHub Copilot Instructions:**
  [официальная документация](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)

---

## ❓ FAQ

**Q: Какие LLM провайдеры поддерживаются?**  
A: OpenAI, Anthropic, нативный **`ollama`** (локально без ключа), **`openai-compat`** (любой OpenAI-совместимый URL: DeepSeek, Together, LM Studio, vLLM, …).

**Q: Можно ли использовать без API-ключа?**  
A: Да — провайдер **`ollama`**: достаточно Ollama на `127.0.0.1:11434` и скачанной модели. Отдельного «API-ключа Ollama» не существует.

**Q: Сколько это стоит?**  
A: Зависит от размера проекта и модели:

- OpenAI gpt-4o: ~$0.50–2.00 на проект (200 файлов)
- Anthropic Claude: ~$1.00–3.00
- Ollama: бесплатно (локально)

**Q: Локальная модель (Mistral 7B и т.д.) выдаёт мало файлов или «no files parsed»?**  
A: Малые модели часто **обрывают ответ** или путают разделители `<<<FILE>>>` / `<<<EOF>>>`. В CLI это обрабатывается: **более мягкий парсер**, второй короткий запрос на формат и при необходимости **stub-файл** с реальными `export` из скана — граф остаётся полным, качество текста лучше пересобрать с **большей моделью** или облаком.

**Q: Безопасно ли отправлять код в LLM?**  
A: Ты контролируешь провайдера. Можно использовать локальный Ollama.

**Q: Хук спамит при каждом push?**  
A: Нет, срабатывает только если есть изменения в Tier 0/1/2 файлах с момента последнего `build`/`actualize`.

**Q: Граф неточный?**  
A: Запусти `npx context-graph review` для отчета. Потом `actualize --all` для пересканирования.

**Q: Как переключить провайдера после первого запуска?**  
A: **Рекомендуется:** отредактируй `.env` (добавь/измени `CONTEXT_GRAPH_PROVIDER=anthropic`). Альтернативы:
отредактируй `.context-graph.json` или удали файл и запусти `build` снова.

**Q: Можно ли использовать разные модели для разных команд?**  
A: Да, через ENV:

```bash
CONTEXT_GRAPH_MODEL=gpt-4o npx context-graph build
CONTEXT_GRAPH_MODEL=o1 npx context-graph actualize  # более мощная модель
```

**Q: Где хранятся настройки? Какой приоритет?**  
A: Приоритет: **CLI флаги** > **ENV переменные** (`.env`) > **`.context-graph.json`** > defaults. ENV —
рекомендуемый способ.
