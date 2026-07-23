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
      // Fix #15: Gemini doesn't support "system" role — extract it as systemInstruction
      const systemMessage = request.messages.find((m) => m.role === "system");
      const chatMessages = request.messages.filter((m) => m.role !== "system");

      const response = await fetch(
        `${baseUrl}/models/${encodeURIComponent(request.model)}:generateContent${options.apiKey ? `?key=${encodeURIComponent(options.apiKey)}` : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Fix #15: pass system message as systemInstruction
            ...(systemMessage ? { systemInstruction: { parts: [{ text: systemMessage.content }] } } : {}),
            contents: chatMessages.map((message) => ({
              // Gemini uses "model" instead of "assistant"
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Gemini request failed: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as any;
      const content = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? "").join("") ?? "";
      // Fix #16: populate usage from Gemini's usageMetadata
      const inputTokens: number = data.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens: number = data.usageMetadata?.candidatesTokenCount ?? 0;
      return {
        model: request.model,
        content,
        raw: data,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
      };
    },
  };
}
