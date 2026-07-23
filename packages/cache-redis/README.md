# @llm-optimize/cache-redis

> Redis-backed LLM response cache for `@llm-optimize/core`. Share cached responses across multiple servers, workers, or serverless functions.

[![npm](https://img.shields.io/npm/v/@llm-optimize/cache-redis)](https://www.npmjs.com/package/@llm-optimize/cache-redis)

---

## Install

```bash
npm install @llm-optimize/cache-redis @llm-optimize/core
```

Works with any Redis client that implements `get`, `set`, and `del` — including `ioredis` and `node-redis`.

---

## Usage — with `ioredis`

```ts
import { LLMOptimizer } from "@llm-optimize/core";
import { RedisCache } from "@llm-optimize/cache-redis";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

const ai = new LLMOptimizer({
  provider: "openai",
  cache: new RedisCache(redis),
  providerClientFactory: { create: () => myClient },
});
```

---

## Usage — with `node-redis`

```ts
import { createClient } from "redis";
import { RedisCache } from "@llm-optimize/cache-redis";

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const cache = new RedisCache(redis);
```

---

## Custom Key Prefix

```ts
// Default prefix is "llm-opt" → keys stored as "llm-opt:<hash>"
const cache = new RedisCache(redis, "my-app");
// Keys stored as "my-app:<hash>"
```

---

## Cache TTL

`LLMOptimizer` sets a default TTL of **5 minutes** per cached response. You can also use the cache directly:

```ts
await cache.set("my-key", { content: "response" }, 120_000); // 2 minute TTL
await cache.get("my-key");
await cache.delete("my-key");
```

---

## When to Use

| Scenario | Use |
|---|---|
| Multiple app servers | ✅ RedisCache |
| Serverless / Lambda | ✅ RedisCache |
| High-traffic production | ✅ RedisCache |
| Local dev / single server | Use `@llm-optimize/cache-memory` instead |

---

## Keywords

redis llm cache, shared llm response cache, openai redis cache, anthropic response caching, llm cost reduction, multi-instance llm cache, ioredis typescript, node-redis typescript, serverless llm cache, distributed ai cache, prompt caching redis
