# @llm-optimizer/core

LLM optimization middleware for token reduction, caching, routing, validation, and analytics.

## Status

Phase 1 scaffold is in place:

- Core middleware pipeline
- Provider-agnostic request/response types
- Memory and Redis cache adapters
- Provider adapter packages
- CLI entrypoint

## Usage

```ts
import { LLMOptimizer } from "@llm-optimizer/core";

const ai = new LLMOptimizer({ provider: "openai", optimize: true });
```
