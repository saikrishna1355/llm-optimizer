import type { ProviderChatRequest, ProviderChatResponse } from "@llm-optimize/core";

export interface AnthropicClient {
  messages(request: ProviderChatRequest): Promise<ProviderChatResponse>;
}

export class AnthropicProvider {
  constructor(private readonly client: AnthropicClient) {}
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    return this.client.messages(request);
  }
}

export interface AnthropicProviderOptions {
  apiKey?: string;
  baseUrl?: string;
}

export function createAnthropicProviderClient(options: AnthropicProviderOptions): AnthropicClient {
  const baseUrl = options.baseUrl ?? "https://api.anthropic.com/v1";
  return {
    async messages(request) {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          ...(options.apiKey ? { "x-api-key": options.apiKey } : {}),
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
          max_tokens: request.maxTokens ?? 1024,
          temperature: request.temperature,
        }),
      });
      if (!response.ok) {
        throw new Error(`Anthropic request failed: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as any;
      const content = Array.isArray(data.content) ? data.content.map((part: any) => part.text ?? "").join("") : "";
      return {
        model: data.model ?? request.model,
        content,
        raw: data,
      };
    },
  };
}
