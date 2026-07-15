import type { CacheAdapter, OptimizerPlugin, OptimizerRuntime } from "./types.js";

export class PluginRegistry implements OptimizerRuntime {
  readonly caches = new Map<string, CacheAdapter>();
  readonly middlewares: Array<Parameters<OptimizerRuntime["registerMiddleware"]>[0]> = [];
  readonly routers = new Set<Parameters<OptimizerRuntime["registerRouter"]>[0]>();
  readonly analytics = new Set<Parameters<OptimizerRuntime["registerAnalytics"]>[0]>();

  registerCache(adapter: CacheAdapter, scope = adapter.constructor.name) {
    this.caches.set(scope, adapter);
  }

  registerMiddleware(middleware: Parameters<OptimizerRuntime["registerMiddleware"]>[0]) {
    this.middlewares.push(middleware);
  }

  registerRouter(router: Parameters<OptimizerRuntime["registerRouter"]>[0]) {
    this.routers.add(router);
  }

  registerAnalytics(sink: Parameters<OptimizerRuntime["registerAnalytics"]>[0]) {
    this.analytics.add(sink);
  }
}

export async function activatePlugins(plugins: OptimizerPlugin[], runtime: OptimizerRuntime): Promise<void> {
  for (const plugin of plugins) {
    if (plugin.init) {
      await plugin.init(runtime);
    }
  }
}
