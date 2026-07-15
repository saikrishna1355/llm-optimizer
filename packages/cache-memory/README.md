# @llm-optimize/cache-memory

`@llm-optimize/cache-memory` provides a simple in-process cache adapter.

## Install

```bash
npm install @llm-optimize/cache-memory
```

## Use

```ts
import { MemoryCache } from "@llm-optimize/cache-memory";

const cache = new MemoryCache();
cache.set("demo", { value: "cached" }, 60_000);
console.log(cache.get("demo"));
```

## Why use it

Use this package for local development or single-instance apps where shared
cache storage is not required.

