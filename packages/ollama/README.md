# @llm-optimize/ollama

> Local Ollama adapter for `@llm-optimize/core`. Run Llama, Mistral, Gemma, Phi, and other open-source models locally — no API key required.

[![npm](https://img.shields.io/npm/v/@llm-optimize/ollama)](https://www.npmjs.com/package/@llm-optimize/ollama)

---

## Install

```bash
npm install @llm-optimize/ollama @llm-optimize/core
```

Requires [Ollama](https://ollama.com) running locally:

```bash
# Install Ollama, then pull a model
ollama pull llama3.1
ollama serve
```

---

## Usage

```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { createOllamaProviderClient } from "@llm-optimize/ollama";

const ai = new LLMOptimizer({
  provider: "ollama",
  providerClientFactory: {
    create: () => createOllamaProviderClient({
      baseUrl: "http://localhost:11434", // default
    }),
  },
});

const response = await ai.chat({
  model: "llama3.1",
  messages: [
    { role: "system", content: "You are a helpful coding assistant." },
    { role: "user", content: "Write a TypeScript function to debounce a callback." },
  ],
});

console.log(response.content);
```

---

## With Memory Cache (recommended for local dev)

```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { createOllamaProviderClient } from "@llm-optimize/ollama";
import { MemoryCache } from "@llm-optimize/cache-memory";

const ai = new LLMOptimizer({
  provider: "ollama",
  cache: new MemoryCache({ maxSize: 100 }),
  providerClientFactory: {
    create: () => createOllamaProviderClient({}),
  },
});
```

---

## Popular Models

| Model | Pull command |
|---|---|
| Llama 3.1 8B | `ollama pull llama3.1` |
| Mistral 7B | `ollama pull mistral` |
| Gemma 2 9B | `ollama pull gemma2` |
| Phi-3 Mini | `ollama pull phi3` |
| CodeLlama | `ollama pull codellama` |
| Qwen 2.5 | `ollama pull qwen2.5` |

---

## What's Included

- `createOllamaProviderClient(options)` — creates a fetch-based Ollama client
- `OllamaProvider` — class wrapper around any `OllamaClient`
- `OllamaClient` interface — implement this to bring your own HTTP client
- `OllamaProviderOptions` — `{ baseUrl? }`

---

## Keywords

ollama typescript client, local llm typescript, llama3 api client, mistral local api, offline llm, self-hosted llm, open source llm adapter, ollama api wrapper, local ai development, llm without api key, private llm, on-premise llm
