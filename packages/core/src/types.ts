export type Role = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: Role;
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ProviderChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  metadata?: Record<string, unknown>;
}

export interface ProviderChatResponse {
  id?: string;
  model: string;
  content: string;
  raw?: unknown;
  usage?: TokenUsage;
  parsed?: unknown;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
}

export interface LLMOptimizerOptions {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  optimize?: boolean;
  providerClientFactory?: ProviderClientFactory;
  modelRouter?: ModelRouter;
  plugins?: OptimizerPlugin[];
  cache?: CacheAdapter;
  tokenBudget?: number;
  redactSensitiveData?: boolean;
  retry?: RetryOptions;
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

export interface ModelRouteContext {
  request: ProviderChatRequest;
  estimatedInputTokens: number;
}

export interface ModelRouter {
  route(context: ModelRouteContext): string;
}

export interface OptimizationResult {
  messages: ChatMessage[];
  tokenSavings: number;
  compressionRatio: number;
  notes: string[];
}

export interface AnalyticsRecord {
  timestamp: number;
  provider: string;
  model: string;
  requestTokens: number;
  responseTokens: number;
  estimatedCostUsd?: number;
  cacheHit: boolean;
  durationMs: number;
  compressionRatio: number;
  tokenSavings: number;
}

export interface AnalyticsSink {
  record(event: AnalyticsRecord): void;
  snapshot(): AnalyticsSnapshot;
}

export interface AnalyticsSnapshot {
  requests: number;
  cacheHits: number;
  inputTokens: number;
  outputTokens: number;
  tokenSavings: number;
  estimatedCostUsd: number;
  averageLatencyMs: number;
  averageCompressionRatio: number;
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void> | void;
  delete?(key: string): Promise<void> | void;
}

export interface OptimizerPlugin {
  name: string;
  init?(runtime: OptimizerRuntime): void | Promise<void>;
}

export interface PromptAnalyzer {
  analyze(messages: ChatMessage[]): Promise<PromptAnalysis> | PromptAnalysis;
}

export interface PromptAnalysis {
  qualityScore: number;
  duplicateInstructions: number;
  tokenCount: number;
  estimatedSavings: number;
  suggestions: string[];
}

export interface OptimizerRuntime {
  registerCache(adapter: CacheAdapter, scope?: string): void;
  registerMiddleware(middleware: OptimizerMiddleware): void;
  registerRouter(router: ModelRouter): void;
  registerAnalytics(sink: AnalyticsSink): void;
}

export interface ProviderClientFactoryOptions {
  provider: string;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
}

export interface ProviderClient {
  chat(request: ProviderChatRequest): Promise<ProviderChatResponse>;
}

export interface ProviderClientFactory {
  create(options: ProviderClientFactoryOptions): Promise<ProviderClient> | ProviderClient;
}

export interface OptimizerMiddlewareContext {
  request: ProviderChatRequest;
  optimized?: OptimizationResult;
  route?: string;
  cacheKey?: string;
  response?: ProviderChatResponse;
  analytics?: AnalyticsRecord;
}

export type OptimizerMiddleware = (
  context: OptimizerMiddlewareContext,
  next: () => Promise<void>,
) => Promise<void>;
