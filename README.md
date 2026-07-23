# llm-optimize

> TypeScript middleware layer for LLM apps — reduce token usage, cut costs, protect sensitive data, and cache responses across OpenAI, Anthropic, Gemini, Ollama, and AWS Bedrock.

[![npm](https://img.shields.io/npm/v/@llm-optimize/core)](https://www.npmjs.com/package/@llm-optimize/core)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![build](https://github.com/your-org/llm-optimize/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/llm-optimize/actions)

---

## What is llm-optimize?

`llm-optimize` sits between your app and any LLM provider. Instead of calling OpenAI or Anthropic directly, you call `LLMOptimizer.chat()` and get automatic:

- **Token savings** — deduplicates messages, compresses whitespace, trims history to a token budget
- **Cost reduction** — caches identical responses so you never pay for the same request twice
- **Security** — redacts API keys, JWTs, credit cards, emails, and phone numbers before they reach the model
- **Reliability** — retries rate limits and server errors with exponential backoff
- **Observability** — tracks tokens, cost, latency, cache hit rate, and compression ratio per request
- **Flexibility** — swap providers, add model routing, or extend with custom plugins

---

## Quick Start

```bash
npm install @llm-optimize/core
```

```ts
import { LLMOptimizer } from "@llm-optimize/core";

const ai = new LLMOptimizer({
  provider: "openai",
  optimize: true,
  redactSensitiveData: true,
  retry: { retries: 2 },
  providerClientFactory: {
    create: () => myOpenAIClient,
  },
});

const response = await ai.chat({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Summarize this document." }],
});

console.log(response.content);
console.log(response.usage);     // { inputTokens, outputTokens, totalTokens }
console.log(ai.analytics);       // { requests, cacheHits, tokenSavings, estimatedCostUsd, ... }
```

---

## How a Request Flows Through the Pipeline

```
Your App
  └── LLMOptimizer.chat()
        1. Redact sensitive data (API keys, emails, credit cards, JWTs, phone numbers)
        2. Deduplicate repeated messages
        3. Trim history to token budget (keeps system messages)
        4. Normalize whitespace in all messages
        5. Check response cache → return instantly if hit
        6. Route to model (optional custom router)
        7. Call provider with retry + timeout
        8. Parse / repair JSON response (if responseFormat: "json")
        9. Store in cache
       10. Record analytics
  └── ProviderChatResponse { content, usage, parsed }
```

---

## Packages

| Package | Purpose | Install |
|---|---|---|
| [`@llm-optimize/core`](./packages/core) | Main API, middleware pipeline, all built-in features | `npm i @llm-optimize/core` |
| [`@llm-optimize/anthropic`](./packages/anthropic) | Anthropic Claude adapter (direct API + AWS Bedrock) | `npm i @llm-optimize/anthropic` |
| [`@llm-optimize/openai`](./packages/openai) | OpenAI adapter (also works with Azure, Groq, Together) | `npm i @llm-optimize/openai` |
| [`@llm-optimize/gemini`](./packages/gemini) | Google Gemini adapter | `npm i @llm-optimize/gemini` |
| [`@llm-optimize/ollama`](./packages/ollama) | Local Ollama adapter (offline / self-hosted models) | `npm i @llm-optimize/ollama` |
| [`@llm-optimize/cache-memory`](./packages/cache-memory) | In-process cache for dev and single-instance apps | `npm i @llm-optimize/cache-memory` |
| [`@llm-optimize/cache-redis`](./packages/cache-redis) | Redis cache for multi-instance / production apps | `npm i @llm-optimize/cache-redis` |
| [`@llm-optimize/cli`](./packages/cli) | CLI for prompt analysis, linting, and benchmarking | `npm i @llm-optimize/cli` |
| [`@llm-optimize/plugin-sdk`](./packages/plugin-sdk) | Types and utilities for building custom plugins | `npm i @llm-optimize/plugin-sdk` |

---

## Common Setups

**Minimal — OpenAI with optimization:**
```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { createOpenAIProviderClient } from "@llm-optimize/openai";

const ai = new LLMOptimizer({
  provider: "openai",
  providerClientFactory: { create: () => createOpenAIProviderClient({ apiKey: process.env.OPENAI_API_KEY }) },
});
```

**Production — Anthropic + Redis cache + model routing:**
```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { createAnthropicProviderClient } from "@llm-optimize/anthropic";
import { RedisCache } from "@llm-optimize/cache-redis";

const ai = new LLMOptimizer({
  provider: "anthropic",
  cache: new RedisCache(redisClient),
  modelRouter: {
    route({ estimatedInputTokens }) {
      return estimatedInputTokens > 2000
        ? "claude-3-5-sonnet-20241022"
        : "claude-3-haiku-20240307";
    },
  },
  providerClientFactory: { create: () => createAnthropicProviderClient({ apiKey: process.env.ANTHROPIC_API_KEY }) },
});
```

**AWS Bedrock — Claude via Bedrock runtime:**
```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

const ai = new LLMOptimizer({
  provider: "anthropic-bedrock",
  providerClientFactory: {
    create: () => ({
      chat: async (request) => {
        const cmd = new InvokeModelCommand({
          modelId: request.model,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1024,
            messages: request.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
            system: request.messages.find((m) => m.role === "system")?.content,
          }),
        });
        const res = await bedrock.send(cmd);
        const data = JSON.parse(new TextDecoder().decode(res.body));
        return { model: request.model, content: data.content.map((p) => p.text).join(""), usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens, totalTokens: data.usage.input_tokens + data.usage.output_tokens } };
      },
    }),
  },
});
```

**Local dev — Ollama with memory cache:**
```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { createOllamaProviderClient } from "@llm-optimize/ollama";
import { MemoryCache } from "@llm-optimize/cache-memory";

const ai = new LLMOptimizer({
  provider: "ollama",
  cache: new MemoryCache({ maxSize: 200 }),
  providerClientFactory: { create: () => createOllamaProviderClient({ baseUrl: "http://localhost:11434" }) },
});
```

---

## Features In Detail

### Sensitive Data Redaction

Automatically masks before every request — no code changes needed:

| Pattern | Example Input | Sent to Model |
|---|---|---|
| OpenAI API key | `sk-abc123...` | `[REDACTED_API_KEY]` |
| AWS access key | `AKIA4GLM7RMS...` | `[REDACTED_AWS_KEY]` |
| JWT token | `eyJhbGci...` | `[REDACTED_JWT]` |
| Credit card | `4111 1111 1111 1111` | `[REDACTED_CREDIT_CARD]` |
| Email address | `user@example.com` | `[REDACTED_EMAIL]` |
| Phone number | `+1-800-555-0100` | `[REDACTED_PHONE]` |

### Token Budget & Context Trimming

```ts
const ai = new LLMOptimizer({ tokenBudget: 4000 }); // trim history beyond 4000 tokens
```

Older messages are dropped when history grows too large. System messages are always preserved.

### Response Caching

```ts
const ai = new LLMOptimizer({ cache: new MemoryCache() });
// Second identical request returns instantly, costs $0
```

### Model Routing

```ts
modelRouter: {
  route({ estimatedInputTokens }) {
    if (estimatedInputTokens < 500) return "claude-3-haiku-20240307";   // cheap
    if (estimatedInputTokens < 3000) return "claude-3-5-sonnet-20241022"; // balanced
    return "claude-3-5-opus-20241022";                                    // powerful
  }
}
```

### Retry with Exponential Backoff

```ts
retry: { retries: 3, baseDelayMs: 200, maxDelayMs: 5000, timeoutMs: 30000 }
// retries on 429, 500, and timeout errors automatically
```

### Analytics

```ts
const stats = ai.analytics;
// {
//   requests: 42,
//   cacheHits: 18,
//   inputTokens: 12400,
//   outputTokens: 8200,
//   tokenSavings: 1340,
//   estimatedCostUsd: 0.0087,
//   averageLatencyMs: 1240,
//   averageCompressionRatio: 0.89
// }
```

### JSON Response Validation

```ts
const response = await ai.chat({
  model: "gpt-4o",
  responseFormat: "json",
  messages: [{ role: "user", content: "Return a JSON object with name and age." }],
});

console.log(response.parsed); // already parsed — no JSON.parse() needed
```

---

## CLI

```bash
# Analyze a single prompt file
npx llm-opt analyze prompt.md

# Lint all prompt files in a folder
npx llm-opt lint prompts/

# Benchmark token savings across a folder
npx llm-opt benchmark prompts/
```

---

## Repository Layout

```
packages/
  core/          Main API and middleware pipeline
  anthropic/     Anthropic Claude adapter
  openai/        OpenAI adapter
  gemini/        Google Gemini adapter
  ollama/        Local Ollama adapter
  cache-memory/  In-process cache
  cache-redis/   Redis cache
  cli/           CLI tools
  plugin-sdk/    Plugin development types
docs/            Documentation
```

---

## Development

```bash
# Install all workspace dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm run test

# Typecheck all packages
npm run typecheck
```

Node.js 20.19+ or 22.13+ recommended. Uses npm workspaces + TurboRepo.

---

## Keywords

llm optimization, token reduction, prompt compression, llm cost savings, openai middleware, anthropic middleware, aws bedrock, gemini adapter, ollama local llm, llm caching, redis llm cache, sensitive data redaction, llm security, prompt linting, token budget, model routing, llm retry, llm analytics, typescript llm, llm middleware, ai cost optimization, llm proxy

---

## License

MIT
