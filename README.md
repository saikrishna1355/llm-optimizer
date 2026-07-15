# llm-optimizer

`llm-optimizer` is a TypeScript monorepo for building an LLM optimization layer between your app and any model provider.

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

## Basic usage

```ts
import { LLMOptimizer } from "@llm-optimizer/core";

const ai = new LLMOptimizer({
  provider: "openai",
  optimize: true,
  providerClientFactory: {
    create: async ({ apiKey }) => {
      return {
        chat: async (request) => {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: request.model,
              messages: request.messages,
              temperature: request.temperature,
            }),
          });

          const data = await response.json();
          return {
            model: data.model ?? request.model,
            content: data.choices?.[0]?.message?.content ?? "",
            raw: data,
          };
        },
      };
    },
  },
});

const response = await ai.chat({
  model: "gpt-5",
  messages: [
    { role: "system", content: "You are a concise assistant." },
    { role: "user", content: "Explain this project." },
  ],
});

console.log(response.content);
```

## Request lifecycle

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

### Analyze a prompt

```bash
npx llm-opt analyze prompt.md
```

Outputs:

- prompt quality score
- token count
- duplicate instructions
- optimization suggestions
- estimated savings

### Lint a folder of prompts

```bash
npx llm-opt lint prompts/
```

Outputs:

- warnings
- errors
- suggestions
- prompt quality score

### Benchmark

```bash
npx llm-opt benchmark
```

Outputs:

- before optimization
- after optimization
- compression ratio
- estimated monthly savings

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

## npm publishing status

The packages are prepared for npm publishing with:

- package names like `@llm-optimizer/core`
- `dist/` build output
- `exports`, `main`, and `types`
- `files` lists for published artifacts
- `publishConfig.access = public`
- package-level version fields

This means you can publish each package after building it.

Example flow:

```bash
npm run build
npm publish packages/core --access public
```

For a full automated release pipeline across all workspaces, the repo still needs a package-aware release tool such as Changesets or a custom publish script per package. I have not hard-wired that yet because multi-package release automation should match your publishing strategy.
