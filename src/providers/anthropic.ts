import Anthropic from '@anthropic-ai/sdk';
import type { LLMMessage, LLMProvider, LLMResponse, ProviderConfig } from './types';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: ProviderConfig) {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new Error(
        `API key not found. Set the ${config.apiKeyEnv} environment variable.`
      );
    }
    this.client = new Anthropic({ apiKey });
    this.model = config.model;
    this.maxTokens = config.maxTokens ?? 16384;
  }

  async complete(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: messages as Anthropic.MessageParam[],
    });
    const block = response.content[0] ?? null;
    return {
      content: block?.type === 'text' ? block.text : '',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
