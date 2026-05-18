import fs from 'fs';
import path from 'path';

const GRAPH_MARKER_PATHS = [
  '.github/instructions/copilot-instructions.md',
  '.github/instructions/context-graph-path-index.md',
  '.github/instructions/index.md',
  '.github/instructions/metadata.json',
] as const;

/** True when a prior context-graph build left core files under `.github/instructions/`. */
export function projectGraphExists(projectRoot: string): boolean {
  return GRAPH_MARKER_PATHS.some(rel => fs.existsSync(path.join(projectRoot, rel)));
}
