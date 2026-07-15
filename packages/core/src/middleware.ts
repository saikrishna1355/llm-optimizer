import type {
  ChatMessage,
  OptimizerMiddleware,
  OptimizerMiddlewareContext,
  OptimizationResult,
} from "./types.js";
import { estimateRequestTokens } from "./token.js";

export function createContextOptimizer(tokenBudget = 6000): OptimizerMiddleware {
  return async (context, next) => {
    const messages = context.request.messages;
    const optimized = optimizeMessages(messages, tokenBudget);
    context.optimized = mergeOptimization(context.optimized, optimized);
    await next();
  };
}

export function createPromptOptimizer(): OptimizerMiddleware {
  return async (context, next) => {
    const messages = context.optimized?.messages ?? context.request.messages;
    const optimizedMessages = messages.map(normalizeMessage);
    const tokenSavings = Math.max(0, estimateRequestTokens({ ...context.request, messages }) - estimateRequestTokens({ ...context.request, messages: optimizedMessages }));
    context.optimized = mergeOptimization(context.optimized, {
      messages: optimizedMessages,
      tokenSavings,
      compressionRatio: messages.length ? optimizedMessages.length / messages.length : 1,
      notes: ["Normalized whitespace and instruction formatting"],
    });
    await next();
  };
}

export function createResponseValidator(): OptimizerMiddleware {
  return async (context, next) => {
    await next();
    const response = context.response;
    if (!response) return;
    if (response.parsed !== undefined) return;
    if (context.request.responseFormat === "json") {
      try {
        response.parsed = JSON.parse(response.content);
      } catch {
        const repaired = repairJson(response.content);
        if (repaired) response.parsed = repaired;
      }
    }
  };
}

export function createAnalyticsMiddleware(record: (context: OptimizerMiddlewareContext) => void): OptimizerMiddleware {
  return async (context, next) => {
    await next();
    record(context);
  };
}

function optimizeMessages(messages: ChatMessage[], tokenBudget: number): OptimizationResult {
  const deduped = dedupeMessages(messages);
  const trimmed = trimHistory(deduped, tokenBudget);
  const originalTokens = estimateRequestTokens({ model: "unknown", messages });
  const optimizedTokens = estimateRequestTokens({ model: "unknown", messages: trimmed });
  return {
    messages: trimmed,
    tokenSavings: Math.max(0, originalTokens - optimizedTokens),
    compressionRatio: originalTokens ? optimizedTokens / originalTokens : 1,
    notes: originalTokens !== optimizedTokens ? ["Reduced redundant or irrelevant history"] : [],
  };
}

function dedupeMessages(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    const key = `${message.role}:${message.content.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(normalizeMessage);
}

function trimHistory(messages: ChatMessage[], tokenBudget: number): ChatMessage[] {
  let total = 0;
  const result: ChatMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message) {
      continue;
    }
    const tokens = estimateRequestTokens({ model: "unknown", messages: [message] });
    if (total + tokens > tokenBudget && message.role !== "system") continue;
    total += tokens;
    result.unshift(message);
  }
  return result;
}

function normalizeMessage(message: ChatMessage): ChatMessage {
  return { ...message, content: message.content.replace(/\s+/g, " ").trim() };
}

function repairJson(content: string): unknown | undefined {
  const trimmed = content.trim();
  const withBraces = trimmed.startsWith("{") || trimmed.startsWith("[") ? trimmed : `{${trimmed}}`;
  try {
    return JSON.parse(withBraces);
  } catch {
    return undefined;
  }
}

function mergeOptimization(existing: OptimizationResult | undefined, incoming: OptimizationResult): OptimizationResult {
  if (!existing) return incoming;
  return {
    messages: incoming.messages,
    tokenSavings: existing.tokenSavings + incoming.tokenSavings,
    compressionRatio: existing.compressionRatio * incoming.compressionRatio,
    notes: [...existing.notes, ...incoming.notes],
  };
}
