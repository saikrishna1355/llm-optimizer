import { activatePlugins, PluginRegistry } from "./plugins.js";
import { MiddlewarePipeline } from "./pipeline.js";
import { estimateCostUsd, estimateRequestTokens, estimateTextTokens } from "./token.js";
import { redactSensitiveText } from "./redaction.js";
import { createContextOptimizer, createPromptOptimizer, createResponseValidator } from "./middleware.js";
import type {
  AnalyticsRecord,
  AnalyticsSink,
  CacheAdapter,
  ChatMessage,
  LLMOptimizerOptions,
  ModelRouteContext,
  ModelRouter,
  OptimizerMiddlewareContext,
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderClient,
} from "./types.js";

class DefaultAnalytics implements AnalyticsSink {
  private readonly records: AnalyticsRecord[] = [];

  record(event: AnalyticsRecord): void {
    this.records.push(event);
  }

  snapshot() {
    const total = this.records.length;
    const aggregate = this.records.reduce(
      (acc, record) => {
        acc.cacheHits += record.cacheHit ? 1 : 0;
        acc.inputTokens += record.requestTokens;
        acc.outputTokens += record.responseTokens;
        acc.tokenSavings += record.tokenSavings;
        acc.estimatedCostUsd += record.estimatedCostUsd ?? 0;
        acc.latency += record.durationMs;
        acc.compressionRatio += record.compressionRatio;
        return acc;
      },
      { cacheHits: 0, inputTokens: 0, outputTokens: 0, tokenSavings: 0, estimatedCostUsd: 0, latency: 0, compressionRatio: 0 },
    );

    return {
      requests: total,
      cacheHits: aggregate.cacheHits,
      inputTokens: aggregate.inputTokens,
      outputTokens: aggregate.outputTokens,
      tokenSavings: aggregate.tokenSavings,
      estimatedCostUsd: aggregate.estimatedCostUsd,
      averageLatencyMs: total ? aggregate.latency / total : 0,
      averageCompressionRatio: total ? aggregate.compressionRatio / total : 0,
    };
  }
}

export class LLMOptimizer {
  private readonly registry = new PluginRegistry();
  private readonly analytics = new DefaultAnalytics();
  private readonly provider: ProviderClient | undefined;
  private readonly options: LLMOptimizerOptions;
  private readonly optimize: boolean;
  private readonly router: ModelRouter | undefined;
  private readonly cache: CacheAdapter | undefined;
  private readonly redact: boolean;
  private readonly retry: Required<NonNullable<LLMOptimizerOptions["retry"]>>;
  private readonly pipeline: MiddlewarePipeline;
  private providerClientPromise: Promise<ProviderClient> | undefined;

  constructor(options: LLMOptimizerOptions, providerClient?: ProviderClient) {
    this.options = options;
    this.provider = providerClient;
    this.optimize = options.optimize ?? true;
    this.router = options.modelRouter;
    this.cache = options.cache;
    this.redact = options.redactSensitiveData ?? true;
    this.retry = {
      retries: options.retry?.retries ?? 2,
      baseDelayMs: options.retry?.baseDelayMs ?? 200,
      maxDelayMs: options.retry?.maxDelayMs ?? 2000,
      timeoutMs: options.retry?.timeoutMs ?? 30000,
    };

    this.registry.registerAnalytics(this.analytics);
    void activatePlugins(options.plugins ?? [], this.registry).catch(() => undefined);
    this.pipeline = new MiddlewarePipeline([
      createContextOptimizer(options.tokenBudget ?? 6000),
      createPromptOptimizer(),
      createResponseValidator(),
    ]);
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const start = performance.now();
    const normalizedRequest = this.redact ? this.redactRequest(request) : request;
    const inputTokens = estimateRequestTokens(normalizedRequest);
    const route = this.route(normalizedRequest, inputTokens);
    const cacheKey = this.buildCacheKey(normalizedRequest, route);
    const context: OptimizerMiddlewareContext = { request: normalizedRequest, route, cacheKey };
    const cached = this.cache ? await this.cache.get<ProviderChatResponse>(cacheKey) : undefined;
    if (cached) {
      this.analytics.record({
        timestamp: Date.now(),
        provider: "cached",
        model: cached.model,
        requestTokens: inputTokens,
        responseTokens: cached.usage?.outputTokens ?? estimateTextTokens(cached.content),
        estimatedCostUsd: 0,
        cacheHit: true,
        durationMs: performance.now() - start,
        compressionRatio: 1,
        tokenSavings: 0,
      });
      return cached;
    }

    const optimized = this.optimize ? this.optimizeRequest(normalizedRequest) : { messages: normalizedRequest.messages, tokenSavings: 0, compressionRatio: 1, notes: [] };
    context.optimized = optimized;
    await this.pipeline.execute(context);
    const response = await this.callProvider({ ...normalizedRequest, model: route, messages: optimized.messages });
    context.response = response;
    if (this.cache) {
      await this.cache.set(cacheKey, response, 5 * 60 * 1000);
    }
    const durationMs = performance.now() - start;
    const responseTokens = response.usage?.outputTokens ?? estimateTextTokens(response.content);
    const record: AnalyticsRecord = {
      timestamp: Date.now(),
      provider: "provider",
      model: route,
      requestTokens: inputTokens,
      responseTokens,
      estimatedCostUsd: estimateCostUsd(inputTokens, responseTokens),
      cacheHit: false,
      durationMs,
      compressionRatio: optimized.compressionRatio,
      tokenSavings: optimized.tokenSavings,
    };
    this.analytics.record(record);
    return response;
  }

  private async callProvider(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const client = await this.resolveProviderClient();
    const attempt = async (): Promise<ProviderChatResponse> => client.chat(request);
    return this.withRetry(attempt);
  }

  private async resolveProviderClient(): Promise<ProviderClient> {
    if (this.provider) {
      return this.provider;
    }
    if (!this.providerClientPromise) {
      this.providerClientPromise = this.createProviderClient();
    }
    return this.providerClientPromise;
  }

  private async createProviderClient(): Promise<ProviderClient> {
    if (this.options.providerClientFactory) {
      return this.options.providerClientFactory.create({
        provider: this.options.provider,
        apiKey: this.options.apiKey,
        baseUrl: this.options.baseUrl,
      });
    }

    throw new Error(
      `No provider client configured for "${this.options.provider}". Pass providerClient or providerClientFactory.`,
    );
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retry.retries; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === this.retry.retries) break;
        const delay = Math.min(this.retry.baseDelayMs * 2 ** attempt, this.retry.maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Provider request failed");
  }

  private optimizeRequest(request: ProviderChatRequest) {
    const deduped = dedupeMessages(request.messages);
    const originalTokens = estimateRequestTokens(request);
    const optimizedTokens = estimateRequestTokens({ ...request, messages: deduped });
    return {
      messages: deduped,
      tokenSavings: Math.max(0, originalTokens - optimizedTokens),
      compressionRatio: originalTokens ? optimizedTokens / originalTokens : 1,
      notes: deduped.length !== request.messages.length ? ["Removed duplicate messages"] : [],
    };
  }

  private redactRequest(request: ProviderChatRequest): ProviderChatRequest {
    return {
      ...request,
      messages: request.messages.map((message) => ({ ...message, content: redactSensitiveText(message.content) })),
    };
  }

  private route(request: ProviderChatRequest, estimatedInputTokens: number): string {
    if (request.model && !this.router) return request.model;
    if (this.router) return this.router.route({ request, estimatedInputTokens } satisfies ModelRouteContext);
    return request.model;
  }

  private buildCacheKey(request: ProviderChatRequest, route: string): string {
    return JSON.stringify({
      route,
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      responseFormat: request.responseFormat,
    });
  }
}

function dedupeMessages(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const result: ChatMessage[] = [];
  for (const message of messages) {
    const key = `${message.role}:${message.content.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...message, content: message.content.trim().replace(/\s+/g, " ") });
  }
  return result;
}
