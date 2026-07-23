# @llm-optimize/anthropic

> Anthropic Claude adapter for `@llm-optimize/core`. Supports direct Anthropic API and AWS Bedrock.

[![npm](https://img.shields.io/npm/v/@llm-optimize/anthropic)](https://www.npmjs.com/package/@llm-optimize/anthropic)

---

## Install

```bash
npm install @llm-optimize/anthropic @llm-optimize/core
```

---

## Usage — Direct Anthropic API

```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { createAnthropicProviderClient } from "@llm-optimize/anthropic";

const ai = new LLMOptimizer({
  provider: "anthropic",
  providerClientFactory: {
    create: () => createAnthropicProviderClient({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  },
});

const response = await ai.chat({
  model: "claude-3-5-sonnet-20241022",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain quantum computing in simple terms." },
  ],
});

console.log(response.content);
console.log(response.usage); // { inputTokens, outputTokens, totalTokens }
```

---

## Usage — AWS Bedrock

Point `baseUrl` at your Bedrock endpoint or use a custom `providerClientFactory`:

```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? "us-east-1" });

const ai = new LLMOptimizer({
  provider: "anthropic-bedrock",
  providerClientFactory: {
    create: () => ({
      chat: async (request) => {
        const cmd = new InvokeModelCommand({
          modelId: request.model,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: request.maxTokens ?? 1024,
            messages: request.messages
              .filter((m) => m.role !== "system")
              .map((m) => ({ role: m.role, content: m.content })),
            system: request.messages.find((m) => m.role === "system")?.content,
          }),
        });
        const res = await bedrock.send(cmd);
        const data = JSON.parse(new TextDecoder().decode(res.body));
        const content = data.content.map((p) => p.text ?? "").join("");
        return {
          model: request.model,
          content,
          raw: data,
          usage: {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          },
        };
      },
    }),
  },
});

const response = await ai.chat({
  model: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  messages: [{ role: "user", content: "What is AWS Bedrock?" }],
});
```

---

## Supported Models

| Model | ID |
|---|---|
| Claude 3.5 Sonnet | `claude-3-5-sonnet-20241022` |
| Claude 3.5 Haiku | `claude-3-5-haiku-20241022` |
| Claude 3 Opus | `claude-3-opus-20240229` |
| Claude 3 Haiku | `claude-3-haiku-20240307` |
| Claude Haiku 4.5 (Bedrock) | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |

---

## What's Included

- `createAnthropicProviderClient(options)` — creates a fetch-based Anthropic client
- `AnthropicProvider` — class wrapper around any `AnthropicClient`
- `AnthropicClient` interface — implement this to bring your own HTTP client
- `AnthropicProviderOptions` — `{ apiKey?, baseUrl? }`

