import type { ChatMessage, ProviderChatRequest } from "./types.js";

const TOKEN_SPLIT = /[\s\p{P}]+/u;

export function estimateTokens(text: string): number {
  const parts = text.trim().split(TOKEN_SPLIT).filter(Boolean);
  return Math.max(1, Math.ceil(parts.length * 1.3));
}

export function estimateTextTokens(text: string): number {
  return estimateTokens(text);
}

export function estimateMessageTokens(message: ChatMessage): number {
  return estimateTokens(message.role) + estimateTokens(message.content);
}

export function estimateRequestTokens(request: ProviderChatRequest): number {
  return request.messages.reduce((total, message) => total + estimateMessageTokens(message), 0);
}

export function estimateCostUsd(inputTokens: number, outputTokens: number, inputRate = 0.00001, outputRate = 0.00003): number {
  return inputTokens * inputRate + outputTokens * outputRate;
}
