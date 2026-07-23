# @llm-optimize/cache-memory

> In-process LLM response cache for `@llm-optimize/core`. Zero dependencies, TTL support, and configurable max size with automatic eviction.

[![npm](https://img.shields.io/npm/v/@llm-optimize/cache-memory)](https://www.npmjs.com/package/@llm-optimize/cache-memory)

---

## Install

```bash
npm install @llm-optimize/cache-memory @llm-optimize/core
```

---

## Usage

```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { MemoryCache } from "@llm-optimize/cache-memory";

const ai = new LLMOptimizer({
  provider: "openai",
  cache: new MemoryCache({ maxSize: 500 }), // evicts oldest entry when full
  providerClientFactory: { create: () => myClient },
});

// First call — hits the provider
const r1 = await ai.chat({ model: "gpt-4o", messages: [{ role: "user", content: "What is 2+2?" }] });

// Second identical call — returns from cache instantly, costs $0
const r2 = await ai.chat({ model: "gpt-4o", messages: [{ role: "user", content: "What is 2+2?" }] });

console.log(ai.analytics.cacheHits); // 1
```

---

## Options

```ts
new MemoryCache({
  maxSize: 500, // max number of cached entries (default: 500)
               // oldest entry is evicted when limit is reached
});
```

---

## Cache TTL

The default TTL set by `LLMOptimizer` is **5 minutes**. You can also use the cache directly:

```ts
const cache = new MemoryCache();

cache.set("my-key", { content: "cached response" }, 60_000); // 60 second TTL
cache.get("my-key"); // returns value or undefined if expired
cache.delete("my-key");
```

---

## When to Use

| Scenario | Use |
|---|---|
| Local development | ✅ MemoryCache |
| Single-instance production server | ✅ MemoryCache |
| Multiple servers / horizontal scaling | ❌ Use `@llm-optimize/cache-redis` instead |
| Serverless functions | ❌ Cache resets on cold start — use Redis |

