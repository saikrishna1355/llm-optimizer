import type { ProviderChatRequest, ProviderChatResponse } from "@llm-optimize/core";

export interface GeminiClient {
  generateContent(request: ProviderChatRequest): Promise<ProviderChatResponse>;
}

export class GeminiProvider {
  constructor(private readonly client: GeminiClient) {}
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    return this.client.generateContent(request);
  }
}

export interface GeminiProviderOptions {
  apiKey?: string;
  baseUrl?: string;
}

export function createGeminiProviderClient(options: GeminiProviderOptions): GeminiClient {
  const baseUrl = options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  return {
    async generateContent(request) {
      const response = await fetch(`${baseUrl}/models/${encodeURIComponent(request.model)}:generateContent${options.apiKey ? `?key=${encodeURIComponent(options.apiKey)}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: request.messages.map((message) => ({
            role: message.role,
            parts: [{ text: message.content }],
          })),
        }),
      });
      if (!response.ok) {
        throw new Error(`Gemini request failed: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as any;
      const content = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? "").join("") ?? "";
      return { model: request.model, content, raw: data };
    },
  };
}
