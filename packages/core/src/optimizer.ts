import { activatePlugins, PluginRegistry } from "./plugins.js";
import { MiddlewarePipeline } from "./pipeline.js";
import { estimateCostUsd, estimateRequestTokens, estimateTextTokens } from "./token.js";
import { redactSensitiveText } from "./redaction.js";
import { createContextOptimizer, createPromptOptimizer, createResponseValidator } from "./middleware.js";
import type {
  AnalyticsRecord,
  AnalyticsSink,
  AnalyticsSnapshot,
  CacheAdapter,
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

  snapshot(): AnalyticsSnapshot {
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
  private readonly _analytics = new DefaultAnalytics();
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

    this.registry.registerAnalytics(this._analytics);

    // Fix #3: log plugin errors instead of silently swallowing them
    void activatePlugins(options.plugins ?? [], this.registry).catch((err) => {
      console.error("[llm-optimize] plugin init error:", err);
    });

    this.pipeline = new MiddlewarePipeline([
      createContextOptimizer(options.tokenBudget ?? 6000),
      createPromptOptimizer(),
      createResponseValidator(),
    ]);
  }

  // Fix #5: expose analytics snapshot publicly
  get analytics(): AnalyticsSnapshot {
    return this._analytics.snapshot();
  }

  async chat(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const start = performance.now();
    const normalizedRequest = this.redact ? this.redactRequest(request) : request;
    const inputTokens = estimateRequestTokens(normalizedRequest);
    const route = this.route(normalizedRequest, inputTokens);

    // Fix #4: build cache key before redaction so identical requests always hit cache
    const cacheKey = this.buildCacheKey(request, route);
    const context: OptimizerMiddlewareContext = { request: normalizedRequest, route, cacheKey };

    const cached = this.cache ? await this.cache.get<ProviderChatResponse>(cacheKey) : undefined;
    if (cached) {
      this._analytics.record({
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

    // Fix #1: removed optimizeRequest() — deduplication now only happens once inside the pipeline
    if (this.optimize) {
      await this.pipeline.execute(context);
    }

    const messages = context.optimized?.messages ?? normalizedRequest.messages;
    const response = await this.callProvider({ ...normalizedRequest, model: route, messages });
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
      // Fix #11: pass model name so correct cost rates are used
      estimatedCostUsd: estimateCostUsd(inputTokens, responseTokens, route),
      cacheHit: false,
      durationMs,
      compressionRatio: context.optimized?.compressionRatio ?? 1,
      tokenSavings: context.optimized?.tokenSavings ?? 0,
    };
    this._analytics.record(record);
    return response;
  }

  private async callProvider(request: ProviderChatRequest): Promise<ProviderChatResponse> {
    const client = await this.resolveProviderClient();
    // Fix #2: apply timeoutMs to each attempt
    const attempt = (): Promise<ProviderChatResponse> =>
      Promise.race([
        client.chat(request),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Provider timeout after ${this.retry.timeoutMs}ms`)), this.retry.timeoutMs),
        ),
      ]);
    return this.withRetry(attempt);
  }

  private async resolveProviderClient(): Promise<ProviderClient> {
    if (this.provider) return this.provider;
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
