export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
}

export interface LLMProvider {
  complete(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse>;
}

export interface ProviderConfig {
  provider: 'openai' | 'anthropic' | 'openai-compat' | 'ollama';
  model: string;
  apiKeyEnv: string;
  baseUrl?: string;
  maxTokens?: number;
}
