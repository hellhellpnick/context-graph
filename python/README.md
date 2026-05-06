# context-graph (Python wrapper)

Thin Python wrapper for the [context-graph](https://www.npmjs.com/package/context-graph) Node.js CLI.

## Requirements

- **Python >=3.9**
- **Node.js >=18** (the actual CLI runs in Node.js)

## Installation

```bash
pip install context-graph
```

## Usage

```bash
export OPENAI_API_KEY=sk-...
context-graph build
```

All commands are proxied to the Node.js binary. See
[main README](https://github.com/your-username/context-graph) for full documentation.

## How it works

1. Looks for `./node_modules/.bin/context-graph` (project-local install)
2. Falls back to global `context-graph` (if `npm install -g context-graph`)
3. Falls back to `npx context-graph` (downloads on demand)

## License

MIT
