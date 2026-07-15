# @llm-optimize/ollama

`@llm-optimize/ollama` creates a client for a local Ollama server.

## Install

```bash
npm install @llm-optimize/ollama
```

## Use

```ts
import { createOllamaProviderClient } from "@llm-optimize/ollama";

const client = createOllamaProviderClient({
  baseUrl: "http://localhost:11434",
});

const response = await client.chat({
  model: "llama3.1",
  messages: [{ role: "user", content: "Hello local model" }],
});

console.log(response.content);
```

## Why use it

Use this package when you want to run models locally through Ollama.

