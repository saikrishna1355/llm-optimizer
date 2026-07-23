import type {
  ChatMessage,
  OptimizerMiddleware,
  OptimizerMiddlewareContext,
  OptimizationResult,
} from "./types.js";
import { estimateRequestTokens } from "./token.js";

export function createContextOptimizer(tokenBudget = 6000): OptimizerMiddleware {
  return async (context, next) => {
    const messages = context.optimized?.messages ?? context.request.messages;
    const trimmed = trimHistory(messages, tokenBudget);
    const originalTokens = estimateRequestTokens({ model: context.request.model, messages });
    const trimmedTokens = estimateRequestTokens({ model: context.request.model, messages: trimmed });
    const wasTrimmed = trimmed.length < messages.length;
    if (wasTrimmed) {
      console.warn(`[llm-optimize] context trimmed: ${messages.length} → ${trimmed.length} messages (budget: ${tokenBudget} tokens)`);
    }
    context.optimized = mergeOptimization(context.optimized, {
      messages: trimmed,
      tokenSavings: Math.max(0, originalTokens - trimmedTokens),
      compressionRatio: originalTokens ? trimmedTokens / originalTokens : 1,
      notes: wasTrimmed ? [`Trimmed history to fit ${tokenBudget} token budget`] : [],
    });
    await next();
  };
}

export function createPromptOptimizer(): OptimizerMiddleware {
  return async (context, next) => {
    const messages = context.optimized?.messages ?? context.request.messages;
    const optimizedMessages = messages.map(normalizeMessage);
    const originalTokens = estimateRequestTokens({ model: context.request.model, messages });
    const optimizedTokens = estimateRequestTokens({ model: context.request.model, messages: optimizedMessages });
    const tokenSavings = Math.max(0, originalTokens - optimizedTokens);
    context.optimized = mergeOptimization(context.optimized, {
      messages: optimizedMessages,
      tokenSavings,
      compressionRatio: originalTokens ? optimizedTokens / originalTokens : 1,
      notes: tokenSavings > 0 ? ["Normalized whitespace and instruction formatting"] : [],
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
        if (repaired !== undefined) response.parsed = repaired;
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

function trimHistory(messages: ChatMessage[], tokenBudget: number): ChatMessage[] {
  let total = 0;
  const result: ChatMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message) continue;
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
  // Only attempt repair if it looks like a JSON object or array
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
  try {
    return JSON.parse(trimmed);
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
