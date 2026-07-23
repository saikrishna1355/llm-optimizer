# @llm-optimize/plugin-sdk

> Types and utilities for building custom plugins for `@llm-optimize/core`. Hook into the request pipeline, register custom middleware, routers, caches, and analytics sinks.

[![npm](https://img.shields.io/npm/v/@llm-optimize/plugin-sdk)](https://www.npmjs.com/package/@llm-optimize/plugin-sdk)

---

## Install

```bash
npm install @llm-optimize/plugin-sdk @llm-optimize/core
```

---

## What Is a Plugin?

A plugin is an object with a `name` and an optional `init(runtime)` function. Inside `init` you register one or more of:

- **Middleware** — intercept requests and responses
- **Router** — override model selection
- **Cache** — plug in a custom cache backend
- **Analytics sink** — receive every analytics event

---

## Examples

### Request / Response Logging Middleware

```ts
import type { OptimizerPlugin } from "@llm-optimize/plugin-sdk";

export const loggingPlugin: OptimizerPlugin = {
  name: "logger",
  init(runtime) {
    runtime.registerMiddleware(async (context, next) => {
      const start = Date.now();
      console.log(`[llm] → ${context.request.model} | ${context.request.messages.length} messages`);
      await next();
      console.log(`[llm] ← ${context.response?.usage?.totalTokens} tokens | ${Date.now() - start}ms`);
    });
  },
};
```

### Custom Redaction Middleware

```ts
export const customRedactionPlugin: OptimizerPlugin = {
  name: "custom-redaction",
  init(runtime) {
    runtime.registerMiddleware(async (context, next) => {
      context.request = {
        ...context.request,
        messages: context.request.messages.map((m) => ({
          ...m,
          content: m.content.replace(/\bACCOUNT-\d{8}\b/g, "[REDACTED_ACCOUNT]"),
        })),
      };
      await next();
    });
  },
};
```

### Custom Analytics Sink (send to your backend)

```ts
import type { OptimizerPlugin, AnalyticsSink, AnalyticsRecord } from "@llm-optimize/plugin-sdk";

class MyAnalyticsSink implements AnalyticsSink {
  record(event: AnalyticsRecord) {
    fetch("https://my-analytics.example.com/events", {
      method: "POST",
      body: JSON.stringify(event),
      headers: { "Content-Type": "application/json" },
    }).catch(console.error);
  }
  snapshot() {
    return { requests: 0, cacheHits: 0, inputTokens: 0, outputTokens: 0, tokenSavings: 0, estimatedCostUsd: 0, averageLatencyMs: 0, averageCompressionRatio: 0 };
  }
}

export const analyticsPlugin: OptimizerPlugin = {
  name: "my-analytics",
  init(runtime) {
    runtime.registerAnalytics(new MyAnalyticsSink());
  },
};
```

### Using Plugins

```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { loggingPlugin, customRedactionPlugin, analyticsPlugin } from "./plugins";

const ai = new LLMOptimizer({
  provider: "openai",
  plugins: [loggingPlugin, customRedactionPlugin, analyticsPlugin],
  providerClientFactory: { create: () => myClient },
});
```

---

## Exported Types

| Type | Description |
|---|---|
| `OptimizerPlugin` | `{ name: string, init?(runtime): void }` |
| `OptimizerRuntime` | `registerMiddleware`, `registerCache`, `registerRouter`, `registerAnalytics` |
| `OptimizerMiddleware` | `(context, next) => Promise<void>` |
| `CacheAdapter` | `get`, `set`, `delete` |
| `ModelRouter` | `route(context): string` |
| `AnalyticsSink` | `record(event)`, `snapshot()` |
| `AnalyticsRecord` | Per-request analytics event shape |
| `PluginRegistry` | Runtime implementation (re-exported from core) |
| `activatePlugins` | Utility to initialize plugins (re-exported from core) |

