# @llm-optimize/anthropic

`@llm-optimize/anthropic` creates an Anthropic client compatible with the
optimizer packages in this repository.

## Install

```bash
npm install @llm-optimize/anthropic
```

## Use

```ts
import { createAnthropicProviderClient } from "@llm-optimize/anthropic";

const client = createAnthropicProviderClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages({
  model: "claude-3-5-sonnet",
  messages: [{ role: "user", content: "Summarize this text." }],
});

console.log(response.content);
```

## Why use it

Use this package when you want a consistent Anthropic Messages API adapter.

