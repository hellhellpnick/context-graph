---
description: "All modules under src/providers"
applyTo: "src/providers/**"
priority: "P1"
last_updated: "2026-05-05"
---

## When to Read
- editing or refactoring `anthropic.ts`
- editing or refactoring `index.ts`
- editing or refactoring `openai.ts`
- editing or refactoring `types.ts`

## Overview
- `src/providers/anthropic.ts` (38 lines · 1 exports) — All modules under src/providers
- `src/providers/index.ts` (19 lines · 2 exports) — All modules under src/providers
- `src/providers/openai.ts` (48 lines · 1 exports) — All modules under src/providers
- `src/providers/types.ts` (27 lines · 5 exports) — All modules under src/providers

## Graph
```mermaid
graph LR
  LLM Providers[LLM Providers]
  LLM Providers --> anthropic[anthropic]
  LLM Providers --> openai[openai]
  LLM Providers --> types[types]
  LLM Providers --> _anthropic_ai_sdk["@anthropic-ai/sdk · npm"]
  LLM Providers --> openai["openai · npm"]
```

## Signatures

### Notes (LLM)

```
<<<FILE: src/providers/anthropic.ts>>>
- **AnthropicProvider**: Implements LLMProvider for Anthropic.
  - Requires `ANTHROPIC_API_KEY` env var or `provider.apiKeyEnv`.
  - Throws error if API key not found.

<<<EOF>>>

<<<FILE: src/providers/index.ts>>>
- **createProvider**: Factory function to choose and instantiate an LLMProvider.
  - Supports 'openai', 'anthropic'.
  - Defaults to throwing an error for unknown providers.

<<<EOF>>>

<<<FILE: src/providers/openai.ts>>>
- **OpenAIProvider**: Implements LLMProvider for OpenAI.
  - Handles 'ollama' with non-standard apiKeyEnv handling.
  - Requires `OPENAI_API_KEY` env var or `provider.apiKeyEnv`.
  - Throws error if API key not found.

<<<EOF>>>
```


```typescript
// ── src/providers/index.ts ──
export function createProvider(config: ProviderConfig): LLMProvider { switch (config.provider) { case 'openai': case 'openai-compat': case 'ollama': return new OpenAIProvider(config); case 'anthropic': return new AnthropicProvider(config…
export type { LLMProvider, LLMMessage, LLMUsage, LLMResponse, ProviderConfig } from './types'

// ── src/providers/anthropic.ts ──
export class AnthropicProvider implements LLMProvider { private client: Anthropic; private model: string; private maxTokens: number; constructor(config: ProviderConfig) { const apiKey = process.env[config.apiKeyEnv]; if (!apiKey) { throw…

// ── src/providers/openai.ts ──
export class OpenAIProvider implements LLMProvider { private client: OpenAI; private model: string; private maxTokens: number; constructor(config: ProviderConfig) { const isOllama = config.provider === 'ollama'; // Ollama (local) has no …

// ── src/providers/types.ts ──
export interface LLMMessage { role: 'user' | 'assistant'; content: string; }
export interface LLMUsage { inputTokens: number; outputTokens: number; }
export interface LLMResponse { content: string; usage: LLMUsage; }
export interface LLMProvider { complete(systemPrompt: string, messages: LLMMessage[]): Promise<LLMResponse>; }
export interface ProviderConfig { provider: 'openai' | 'anthropic' | 'openai-compat' | 'ollama'; model: string; apiKeyEnv: string; baseUrl?: string; maxTokens?: number; }

```

## Dependencies
**Internal:**
- `src/providers/anthropic`
- `src/providers/openai`
- `src/providers/types`

**External (npm):**
- `@anthropic-ai/sdk`
- `openai`

## Error Handling
- `Error`: "API key not found. Set the ${config.apiKeyEnv} environment variable." (`anthropic.ts`)
- `Error`: "Unknown provider: ${(config as ProviderConfig).provider}" (`index.ts`)

## Danger Zone 🔴
- No env vars or side effects detected