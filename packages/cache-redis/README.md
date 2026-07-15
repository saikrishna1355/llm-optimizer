# @llm-optimize/cache-redis

`@llm-optimize/cache-redis` provides a Redis-backed cache adapter.

## Install

```bash
npm install @llm-optimize/cache-redis
```

## Use

```ts
import { RedisCache } from "@llm-optimize/cache-redis";

const cache = new RedisCache(redisClient);
```

## Why use it

Use this package when you need cache sharing across multiple app instances.

