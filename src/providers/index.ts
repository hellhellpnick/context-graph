import type { LLMProvider, ProviderConfig } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
    case 'openai-compat':
    case 'ollama':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unknown provider: ${(config as ProviderConfig).provider}`);
  }
}

export type { LLMProvider, LLMMessage, LLMUsage, LLMResponse, ProviderConfig } from './types';
