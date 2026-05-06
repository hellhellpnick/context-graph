import OpenAI from 'openai';
import type { LLMMessage, LLMProvider, LLMResponse, ProviderConfig } from './types';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor(config: ProviderConfig) {
    const isOllama = config.provider === 'ollama';
    // Ollama (local) has no API secret; the OpenAI client still requires a non-empty string.
    const fromEnv = config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined;
    const apiKey = fromEnv ?? (isOllama ? 'ollama' : undefined);
    if (!apiKey) {
      throw new Error(
        config.apiKeyEnv
          ? `API key not found. Set the ${config.apiKeyEnv} environment variable.`
          : `API key not found. Set the provider's apiKeyEnv in .context-graph.json or switch provider.`
      );
    }
    const baseURL = config.baseUrl ?? (isOllama ? 'http://127.0.0.1:11434/v1' : undefined);
    this.client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    this.model = config.model;
    this.maxTokens = config.maxTokens ?? 16384;
  }

  async complete(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });
    return {
      content: response.choices[0]?.message?.content ?? '',
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}
