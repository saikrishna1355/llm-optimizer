# @llm-optimize/core

`@llm-optimize/core` is the main package in the `llm-optimize` system.

It provides:

- `LLMOptimizer`
- request/response types
- prompt and context optimization
- token estimation
- retries
- response validation
- redaction
- analytics hooks
- plugin runtime primitives

## Install

```bash
npm install @llm-optimize/core
```

## Use

```ts
import { LLMOptimizer } from "@llm-optimize/core";

const ai = new LLMOptimizer({
  provider: "openai",
  optimize: true,
  providerClientFactory: {
    create: async () => ({
      chat: async (request) => ({
        model: request.model,
        content: "demo response",
      }),
    }),
  },
});

const response = await ai.chat({
  model: "gpt-5",
  messages: [{ role: "user", content: "Summarize this document." }],
});

console.log(response.content);
```

## Why use it

Use `core` when you want the full optimization layer around your LLM requests.

