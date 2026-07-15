# @llm-optimize/gemini

`@llm-optimize/gemini` creates a Gemini client compatible with the optimizer
packages in this repository.

## Install

```bash
npm install @llm-optimize/gemini
```

## Use

```ts
import { createGeminiProviderClient } from "@llm-optimize/gemini";

const client = createGeminiProviderClient({
  apiKey: process.env.GEMINI_API_KEY,
});

const response = await client.generateContent({
  model: "gemini-1.5-pro",
  messages: [{ role: "user", content: "Write a summary." }],
});

console.log(response.content);
```

## Why use it

Use this package when you want a consistent adapter for Google Gemini.

