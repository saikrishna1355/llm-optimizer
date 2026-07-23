# @llm-optimize/core

> The main LLM optimization middleware for TypeScript apps. Reduces token usage, cuts API costs, protects sensitive data, caches responses, and retries failures — all in one `chat()` call.

[![npm](https://img.shields.io/npm/v/@llm-optimize/core)](https://www.npmjs.com/package/@llm-optimize/core)

---

## Install

```bash
npm install @llm-optimize/core
```

---

## What It Does

`LLMOptimizer` wraps any LLM provider and runs a middleware pipeline on every request:

1. **Redacts** sensitive data (API keys, JWTs, emails, credit cards, phone numbers)
2. **Deduplicates** repeated messages in conversation history
3. **Trims** history to a configurable token budget
4. **Normalizes** whitespace across all messages
5. **Checks cache** — returns instantly if response is already stored
6. **Routes** to the right model via your custom router
7. **Calls** the provider with timeout and exponential backoff retry
8. **Validates** and repairs JSON responses
9. **Records** analytics: tokens, cost, latency, savings, cache hit rate

---

## Quick Start

```ts
import { LLMOptimizer } from "@llm-optimize/core";

const ai = new LLMOptimizer({
  provider: "openai",
  optimize: true,                  // enable dedup + whitespace normalization
  redactSensitiveData: true,       // mask secrets before sending to model
  tokenBudget: 6000,               // trim history beyond this token count
  retry: { retries: 2, timeoutMs: 30000 },
  providerClientFactory: {
    create: () => myProviderClient, // any object with .chat(request) method
  },
});

const response = await ai.chat({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Summarize this document." },
  ],
});

console.log(response.content);
console.log(response.usage);   // { inputTokens, outputTokens, totalTokens }
console.log(ai.analytics);     // session-level stats
```

---

## Configuration Options

```ts
new LLMOptimizer({
  provider: "openai",              // provider name (string label, used in analytics)
  apiKey: "...",                   // passed to providerClientFactory if needed
  baseUrl: "...",                  // custom endpoint (Azure, Bedrock, etc.)
  optimize: true,                  // default: true — enables dedup + normalization
  redactSensitiveData: true,       // default: true — masks secrets in messages
  tokenBudget: 6000,               // default: 6000 — max tokens in history
  cache: myCacheAdapter,           // MemoryCache or RedisCache
  modelRouter: myRouter,           // custom model selection logic
  plugins: [myPlugin],             // custom middleware plugins
  retry: {
    retries: 2,                    // default: 2
    baseDelayMs: 200,              // default: 200ms
    maxDelayMs: 2000,              // default: 2000ms
    timeoutMs: 30000,              // default: 30s per attempt
  },
  providerClientFactory: {
    create: (options) => client,   // factory receives { provider, apiKey, baseUrl }
  },
});
```

---

## Redaction

Sensitive patterns masked automatically before every request:

| Type | Pattern matched | Replacement |
|---|---|---|
| OpenAI API key | `sk-...` | `[REDACTED_API_KEY]` |
| AWS access key | `AKIA...` | `[REDACTED_AWS_KEY]` |
| AWS secret key | 40-char base64 string | `[REDACTED_AWS_SECRET]` |
| JWT | `eyJ...` | `[REDACTED_JWT]` |
| Credit card | 13–16 digit card number | `[REDACTED_CREDIT_CARD]` |
| Email | `user@domain.com` | `[REDACTED_EMAIL]` |
| Phone | `+1-800-555-0100` | `[REDACTED_PHONE]` |

---

## Caching

```ts
import { MemoryCache } from "@llm-optimize/cache-memory";

const ai = new LLMOptimizer({
  cache: new MemoryCache({ maxSize: 500 }),
  // ...
});

// First call hits the provider
await ai.chat({ model: "gpt-4o", messages: [...] });

// Second identical call returns from cache instantly — $0 cost
await ai.chat({ model: "gpt-4o", messages: [...] });
```

Cache TTL is 5 minutes by default. Use `@llm-optimize/cache-redis` for shared cache across multiple servers.

---

## Model Routing

```ts
const ai = new LLMOptimizer({
  modelRouter: {
    route({ request, estimatedInputTokens }) {
      if (estimatedInputTokens < 500) return "claude-3-haiku-20240307";
      return "claude-3-5-sonnet-20241022";
    },
  },
});
```

---

## JSON Response Validation

```ts
const response = await ai.chat({
  model: "gpt-4o",
  responseFormat: "json",
  messages: [{ role: "user", content: "Return JSON: { name, score }" }],
});

// response.parsed is already the parsed object — no JSON.parse() needed
// If the model returns slightly broken JSON, the optimizer attempts auto-repair
console.log(response.parsed);
```

---

## Analytics

```ts
const stats = ai.analytics;
// {
//   requests: 10,
//   cacheHits: 4,
//   inputTokens: 8400,
//   outputTokens: 3200,
//   tokenSavings: 620,
//   estimatedCostUsd: 0.0043,
//   averageLatencyMs: 1180,
//   averageCompressionRatio: 0.91
// }
```

---

## Plugins

```ts
import type { OptimizerPlugin } from "@llm-optimize/plugin-sdk";

const loggingPlugin: OptimizerPlugin = {
  name: "logger",
  init(runtime) {
    runtime.registerMiddleware(async (context, next) => {
      console.log("request:", context.request.model);
      await next();
      console.log("response tokens:", context.response?.usage?.totalTokens);
    });
  },
};

const ai = new LLMOptimizer({ plugins: [loggingPlugin], ... });
```

---

## Keywords

llm optimization, token reduction, prompt compression, openai middleware, anthropic middleware, llm cost savings, sensitive data redaction, llm caching, model routing, llm retry, llm analytics, typescript llm, ai middleware, llm proxy, token budget, context trimming, json repair, llm security
