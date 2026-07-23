# @llm-optimize/gemini

> Google Gemini adapter for `@llm-optimize/core`. Supports Gemini 1.5 Pro, Gemini 1.5 Flash, and Gemini 2.0 models.

[![npm](https://img.shields.io/npm/v/@llm-optimize/gemini)](https://www.npmjs.com/package/@llm-optimize/gemini)

---

## Install

```bash
npm install @llm-optimize/gemini @llm-optimize/core
```

---

## Usage

```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { createGeminiProviderClient } from "@llm-optimize/gemini";

const ai = new LLMOptimizer({
  provider: "gemini",
  providerClientFactory: {
    create: () => createGeminiProviderClient({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  },
});

const response = await ai.chat({
  model: "gemini-1.5-flash",
  messages: [
    { role: "system", content: "You are a concise assistant." },
    { role: "user", content: "What is the capital of France?" },
  ],
});

console.log(response.content);
console.log(response.usage); // { inputTokens, outputTokens, totalTokens }
```

---

## System Messages

Gemini does not support a `system` role in the messages array. This adapter automatically extracts `role: "system"` messages and passes them as `systemInstruction` — you don't need to handle this yourself.

```ts
// This works correctly — system message is handled automatically
messages: [
  { role: "system", content: "Always respond in bullet points." },
  { role: "user", content: "List 3 benefits of TypeScript." },
]
```

---

## Supported Models

| Model | ID |
|---|---|
| Gemini 1.5 Flash | `gemini-1.5-flash` |
| Gemini 1.5 Pro | `gemini-1.5-pro` |
| Gemini 2.0 Flash | `gemini-2.0-flash` |
| Gemini 2.0 Flash Lite | `gemini-2.0-flash-lite` |

---

## What's Included

- `createGeminiProviderClient(options)` — creates a fetch-based Gemini client
- `GeminiProvider` — class wrapper around any `GeminiClient`
- `GeminiClient` interface — implement this to bring your own HTTP client
- `GeminiProviderOptions` — `{ apiKey?, baseUrl? }`

