# @llm-optimize/plugin-sdk

`@llm-optimize/plugin-sdk` provides the shared types you need to build plugins
for the optimizer runtime.

## Install

```bash
npm install @llm-optimize/plugin-sdk
```

## Use

```ts
import type { OptimizerPlugin } from "@llm-optimize/plugin-sdk";

export const myPlugin: OptimizerPlugin = {
  name: "my-plugin",
  init(runtime) {
    runtime.registerMiddleware(async (context, next) => {
      await next();
    });
  },
};
```

## Why use it

Use this package when you want to extend the optimizer with your own plugin.

