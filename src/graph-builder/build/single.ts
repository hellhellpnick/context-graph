import type { Config } from '../../config';
import type { ScanResult } from '../../scanner';
import type { BuildMode, BuildOptions, GraphResult } from '../types';
import { createProvider } from '../../providers';
import { parseOutputFiles } from '../../writer';
import { loadSystemPrompt } from '../prompt';
import { buildUserMessage } from '../messages/subsystem';
import { estimateCost } from '../cost';

export async function buildGraph(
  scan: ScanResult,
  config: Config,
  mode: BuildMode,
  opts: BuildOptions = {}
): Promise<GraphResult> {
  const systemPrompt = loadSystemPrompt();
  const provider = createProvider(config.provider);
  const userMessage = buildUserMessage(mode, scan, opts);

  const response = await provider.complete(systemPrompt, [{ role: 'user', content: userMessage }]);
  const files = parseOutputFiles(response.content);
  const costUSD = estimateCost(config.provider.model, response.usage);
  return { files, rawResponse: response.content, usage: response.usage, costUSD };
}
