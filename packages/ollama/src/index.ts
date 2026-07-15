import type { ProviderChatRequest, ProviderChatResponse } from "@llm-optimizer/core";

export interface OllamaClient {
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse>;
}

export class OllamaProvider {
  constructor(private readonly client: OllamaClient) {}
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    return this.client.chat(request);
  }
}

export interface OllamaProviderOptions {
  baseUrl?: string;
}

export function createOllamaProviderClient(options: OllamaProviderOptions): OllamaClient {
  const baseUrl = options.baseUrl ?? "http://localhost:11434";
  return {
    async chat(request) {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: false,
        }),
      });
      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as any;
      return {
        model: data.model ?? request.model,
        content: data.message?.content ?? "",
        raw: data,
      };
    },
  };
}
