# @llm-optimize/openai

> OpenAI adapter for `@llm-optimize/core`. Works with OpenAI, Azure OpenAI, Groq, Together AI, and any OpenAI-compatible API.

[![npm](https://img.shields.io/npm/v/@llm-optimize/openai)](https://www.npmjs.com/package/@llm-optimize/openai)

---

## Install

```bash
npm install @llm-optimize/openai @llm-optimize/core
```

---

## Usage — OpenAI

```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { createOpenAIProviderClient } from "@llm-optimize/openai";

const ai = new LLMOptimizer({
  provider: "openai",
  providerClientFactory: {
    create: () => createOpenAIProviderClient({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  },
});

const response = await ai.chat({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Write a short poem about TypeScript." },
  ],
  temperature: 0.7,
  maxTokens: 512,
});

console.log(response.content);
console.log(response.usage); // { inputTokens, outputTokens, totalTokens }
```

---

## Usage — Azure OpenAI

```ts
import { createOpenAIProviderClient } from "@llm-optimize/openai";

const client = createOpenAIProviderClient({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseUrl: "https://<your-resource>.openai.azure.com/openai/deployments/<deployment>",
});
```

---

## Usage — Groq / Together AI (OpenAI-compatible)

```ts
const client = createOpenAIProviderClient({
  apiKey: process.env.GROQ_API_KEY,
  baseUrl: "https://api.groq.com/openai/v1",
});
```

---

## Supported Models

| Model | ID |
|---|---|
| GPT-4o | `gpt-4o` |
| GPT-4o mini | `gpt-4o-mini` |
| GPT-4 Turbo | `gpt-4-turbo` |
| GPT-3.5 Turbo | `gpt-3.5-turbo` |
| o1 | `o1` |
| o1-mini | `o1-mini` |

---

## What's Included

- `createOpenAIProviderClient(options)` — creates a fetch-based OpenAI client
- `OpenAIProvider` — class wrapper around any `OpenAIClient`
- `OpenAIClient` interface — implement this to bring your own HTTP client
- `OpenAIProviderOptions` — `{ apiKey?, baseUrl? }`

---

## Keywords

openai typescript adapter, gpt-4o client, openai chat completions, azure openai adapter, groq api client, together ai, openai compatible api, llm provider adapter, gpt typescript sdk, openai middleware, token usage tracking
