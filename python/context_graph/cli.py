"""
context_graph.cli
-----------------
Thin wrapper that delegates all execution to the Node.js context-graph CLI.
Node.js >=18 is required.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


def _find_binary() -> list[str]:
    """Return the command prefix to invoke context-graph."""
    # 1. Local node_modules (project-local install)
    local = Path.cwd() / "node_modules" / ".bin" / "context-graph"
    local_cmd = local.with_suffix(".cmd")
    if local.exists():
        return [str(local)]
    if local_cmd.exists():
        return [str(local_cmd)]

    # 2. Globally installed binary
    if shutil.which("context-graph"):
        return ["context-graph"]

    # 3. npx fallback (downloads on demand)
    if shutil.which("npx"):
        return ["npx", "--yes", "context-graph"]

    return []


def main() -> None:
    if shutil.which("node") is None:
        print(
            "Error: Node.js >=18 is required to run context-graph.\n"
            "Install it from https://nodejs.org",
            file=sys.stderr,
        )
        sys.exit(1)

    prefix = _find_binary()
    if not prefix:
        print(
            "Error: context-graph CLI not found and npx is unavailable.\n"
            "Install it with:  npm install -g context-graph",
            file=sys.stderr,
        )
        sys.exit(1)

    cmd = prefix + sys.argv[1:]
    try:
        result = subprocess.run(cmd, check=False)
        sys.exit(result.returncode)
    except KeyboardInterrupt:
        sys.exit(130)


if __name__ == "__main__":
    main()
