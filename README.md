# llm-optimize

`llm-optimize` is a TypeScript monorepo for building an LLM optimization layer between your app and any model provider.

The goal is to reduce token usage, latency, and cost while improving prompt quality with minimal code changes.

## What this project does

`LLMOptimizer` sits in front of your provider call and can automatically:

- optimize prompts
- clean conversation context
- cache responses
- route to a model
- retry failed requests
- redact sensitive data
- validate JSON output
- collect analytics

## Repository layout

- `packages/core` - main public API and middleware pipeline
- `packages/openai` - OpenAI provider adapter
- `packages/anthropic` - Anthropic provider adapter
- `packages/gemini` - Gemini provider adapter
- `packages/ollama` - Ollama provider adapter
- `packages/cache-memory` - in-memory cache adapter
- `packages/cache-redis` - Redis cache adapter
- `packages/cli` - CLI for prompt analysis and linting
- `packages/plugin-sdk` - plugin development surface
- `packages/examples` - example usage
- `docs` - documentation files

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Typecheck

```bash
npm run typecheck
```

## Package Guide

Use the sections below to pick the right package for your app.

### `@llm-optimize/core`

Use this when you want the optimization middleware and the main `LLMOptimizer` API.

Install:

```bash
npm install @llm-optimize/core
```

Example:

```ts
import { LLMOptimizer } from "@llm-optimize/core";

const ai = new LLMOptimizer({
  provider: "openai",
  optimize: true,
  providerClientFactory: {
    create: async () => ({
      chat: async (request) => {
        return {
          model: request.model,
          content: "Hello from core",
        };
      },
    }),
  },
});

const response = await ai.chat({
  model: "gpt-5",
  messages: [{ role: "user", content: "Summarize this repo." }],
});
```

### `@llm-optimize/openai`

Use this when you want an OpenAI provider adapter.

Install:

```bash
npm install @llm-optimize/openai
```

Example:

```ts
import { createOpenAIProviderClient } from "@llm-optimize/openai";

const client = createOpenAIProviderClient({
  apiKey: process.env.OPENAI_API_KEY,
});
```

### `@llm-optimize/anthropic`

Use this when you want an Anthropic provider adapter.

Install:

```bash
npm install @llm-optimize/anthropic
```

Example:

```ts
import { createAnthropicProviderClient } from "@llm-optimize/anthropic";

const client = createAnthropicProviderClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### `@llm-optimize/gemini`

Use this when you want a Gemini provider adapter.

Install:

```bash
npm install @llm-optimize/gemini
```

Example:

```ts
import { createGeminiProviderClient } from "@llm-optimize/gemini";

const client = createGeminiProviderClient({
  apiKey: process.env.GEMINI_API_KEY,
});
```

### `@llm-optimize/ollama`

Use this when you want to connect to a local Ollama server.

Install:

```bash
npm install @llm-optimize/ollama
```

Example:

```ts
import { createOllamaProviderClient } from "@llm-optimize/ollama";

const client = createOllamaProviderClient({
  baseUrl: "http://localhost:11434",
});
```

### `@llm-optimize/cache-memory`

Use this for in-process caching during development or for single-instance deployments.

Install:

```bash
npm install @llm-optimize/cache-memory
```

Example:

```ts
import { MemoryCache } from "@llm-optimize/cache-memory";

const cache = new MemoryCache();
```

### `@llm-optimize/cache-redis`

Use this when you need shared caching across multiple app instances.

Install:

```bash
npm install @llm-optimize/cache-redis
```

Example:

```ts
import { RedisCache } from "@llm-optimize/cache-redis";

const cache = new RedisCache(redisClient);
```

### `@llm-optimize/cli`

Use this for prompt analysis, linting, and benchmark commands.

Install:

```bash
npm install @llm-optimize/cli
```

Examples:

```bash
npx llm-opt analyze prompt.md
npx llm-opt lint prompts/
npx llm-opt benchmark
```

### `@llm-optimize/plugin-sdk`

Use this when you want to build custom plugins against the optimizer runtime.

Install:

```bash
npm install @llm-optimize/plugin-sdk
```

Example:

```ts
import type { OptimizerPlugin } from "@llm-optimize/plugin-sdk";

export const myPlugin: OptimizerPlugin = {
  name: "my-plugin",
  init(runtime) {
    runtime.registerMiddleware(async (context, next) => {
      await next();
    });
  },
};
```

### `packages/examples`

Use this folder as a quick reference for a minimal working example.

## Request Lifecycle

The intended pipeline is:

1. Request enters `LLMOptimizer`
2. Context optimizer removes duplicate or irrelevant history
3. Prompt optimizer normalizes and compresses prompt text
4. Prompt cache checks whether an optimization result already exists
5. Response cache checks whether the full response is already available
6. Model router can override or refine the target model
7. Provider client executes the LLM request
8. Response validator parses or repairs JSON if requested
9. Analytics record tokens, cost, latency, savings, and cache hit rate
10. Optimized response is returned to the caller

## Features

### Prompt optimization

- removes duplicate instructions
- removes duplicate examples
- merges repeated system prompts
- compresses whitespace
- preserves meaning as much as possible
- estimates token savings

### Context optimization

- removes duplicated conversation history
- trims older or irrelevant messages
- supports token budget limits
- can be extended to add summarization

### Caching

- memory cache
- Redis cache
- configurable TTL
- request-based cache keys

### Token analysis

- estimated input tokens before a request
- estimated output tokens after a response
- estimated cost
- savings and compression ratio

### Routing

- custom model routing rules
- support for user overrides
- useful for choosing smaller models for simple tasks

### Retry

- retries 429, 500, and timeout-style failures
- exponential backoff
- configurable retry limits

### Response validation

- JSON parsing support
- best-effort repair for invalid JSON responses

### Security

- redacts:
  - passwords
  - API keys
  - JWTs
  - credit cards
  - email addresses
  - phone numbers

### Analytics

- request count
- token usage
- estimated cost
- latency
- cache hit rate
- compression ratio
- savings

## CLI

See the `@llm-optimize/cli` package guide above for usage examples.

## Integrating In An App

The most common setup is:

1. install `@llm-optimize/core`
2. install exactly one provider adapter, such as `@llm-optimize/openai`
3. optionally install a cache package
4. create `LLMOptimizer`
5. call `chat()` instead of calling the provider directly

If you want caching, routing, or plugins, add those packages or options as needed.

## GitHub Actions

If you pushed this repo and saw build jobs start automatically, that is expected.

The workflow lives in:

- [.github/workflows/ci.yml](/home/administrator/learn/LLMOptimizer/.github/workflows/ci.yml)

It is configured with:

- `on: push`
- `on: pull_request`

That means GitHub runs the workflow automatically whenever:

- you push code to the repository
- you open or update a pull request

The job currently does:

1. checks out the code
2. sets up Node.js 20
3. runs `npm install`
4. runs `npm run build`
5. runs `npm run test`

So the build trigger is not coming from your local machine. It is coming from the workflow definition committed in the repo.

## Current status

The repo is scaffolded and typechecks/tests pass, but some parts are still intentionally minimal:

- provider auto-wiring is not fully automatic yet
- plugin ecosystem integrations are not fully implemented
- docs are still being expanded

## Development notes

- Node.js 20.19+ or 22.13+ is recommended
- npm workspaces are enabled
- TurboRepo runs the package scripts in order

## License

Add your project license here before publishing publicly.

## npm Publishing Status

The packages are prepared for npm publishing with:

- package names like `@llm-optimize/core`
- `dist/` build output
- `exports`, `main`, and `types`
- `files` lists for published artifacts
- `publishConfig.access = public`
- package-level version fields

This means you can publish each package after building it.

Example flow:

```bash
npm run build
npm publish --workspace @llm-optimize/core --access public
```

For a full automated release pipeline across all workspaces, the repo still needs a package-aware release tool such as Changesets or a custom publish script per package. I have not hard-wired that yet because multi-package release automation should match your publishing strategy.
