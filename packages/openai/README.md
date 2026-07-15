# @llm-optimize/openai

`@llm-optimize/openai` creates an OpenAI client compatible with the optimizer
packages in this repository.

## Install

```bash
npm install @llm-optimize/openai
```

## Use

```ts
import { createOpenAIProviderClient } from "@llm-optimize/openai";

const client = createOpenAIProviderClient({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await client.chatCompletions({
  model: "gpt-5",
  messages: [{ role: "user", content: "Hello" }],
});

console.log(response.content);
```

## Why use it

Use this package when you want to talk to OpenAI through a normalized client
interface that fits the optimizer core.

