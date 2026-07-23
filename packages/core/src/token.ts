import type { ChatMessage, ProviderChatRequest } from "./types.js";

// Splits on whitespace, punctuation, and CJK/Arabic character boundaries
const TOKEN_SPLIT = /[\s\p{P}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Arabic}]/u;

// Per-model cost rates (USD per token). Falls back to default if model not found.
const COST_RATES: Record<string, { input: number; output: number }> = {
  "claude-3-haiku":   { input: 0.00000025, output: 0.00000125 },
  "claude-haiku-4":   { input: 0.0000008,  output: 0.000004 },
  "claude-3-sonnet":  { input: 0.000003,   output: 0.000015 },
  "claude-3-opus":    { input: 0.000015,   output: 0.000075 },
  "gpt-3.5-turbo":    { input: 0.0000005,  output: 0.0000015 },
  "gpt-4o":           { input: 0.000005,   output: 0.000015 },
  "gpt-4o-mini":      { input: 0.00000015, output: 0.0000006 },
  "gemini-1.5-flash": { input: 0.000000075,output: 0.0000003 },
  "gemini-1.5-pro":   { input: 0.00000125, output: 0.000005 },
  default:            { input: 0.000001,   output: 0.000003 },
};

function getRates(model: string): { input: number; output: number } {
  const key = Object.keys(COST_RATES).find((k) => model.toLowerCase().includes(k));
  return key ? COST_RATES[key]! : COST_RATES["default"]!;
}

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

export function estimateCostUsd(inputTokens: number, outputTokens: number, model = "default"): number {
  const rates = getRates(model);
  return inputTokens * rates.input + outputTokens * rates.output;
}
