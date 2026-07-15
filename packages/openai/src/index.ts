import type { ProviderChatRequest, ProviderChatResponse } from "@llm-optimize/core";

export interface OpenAIClient {
  chatCompletions(request: ProviderChatRequest): Promise<ProviderChatResponse>;
}

export class OpenAIProvider {
  constructor(private readonly client: OpenAIClient) {}

  chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    return this.client.chatCompletions(request);
  }
}

export interface OpenAIProviderOptions {
  apiKey?: string;
  baseUrl?: string;
}

export function createOpenAIProviderClient(options: OpenAIProviderOptions): OpenAIClient {
  const baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  return {
    async chatCompletions(request): Promise<ProviderChatResponse> {
      const httpResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
      });
      if (!httpResponse.ok) {
        throw new Error(`OpenAI request failed: ${httpResponse.status} ${httpResponse.statusText}`);
      }
      const data = (await httpResponse.json()) as any;
      const content = data.choices?.[0]?.message?.content ?? "";
      const chatResponse: ProviderChatResponse = {
        model: data.model ?? request.model,
        content,
        raw: data,
      };
      if (data.usage) {
        chatResponse.usage = {
          inputTokens: data.usage.prompt_tokens ?? 0,
          outputTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        };
      }
      return chatResponse;
    },
  };
}
