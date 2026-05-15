import type { LLMUsage } from '../providers/types';
import { PRICING } from './constants';

export function estimateCost(model: string, usage: LLMUsage): number | null {
  const pricing = PRICING[model];
  if (!pricing) {
    const key = Object.keys(PRICING).find(k => model.startsWith(k));
    if (!key) return null;
    const p = PRICING[key];
    return (usage.inputTokens / 1_000_000) * p.input + (usage.outputTokens / 1_000_000) * p.output;
  }
  return (usage.inputTokens / 1_000_000) * pricing.input + (usage.outputTokens / 1_000_000) * pricing.output;
}
