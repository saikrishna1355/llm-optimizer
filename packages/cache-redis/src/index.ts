import type { CacheAdapter } from "@llm-optimizer/core";

export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { PX?: number }): Promise<unknown>;
  del(key: string): Promise<number>;
}

export class RedisCache implements CacheAdapter {
  constructor(private readonly client: RedisLikeClient, private readonly keyPrefix = "llm-opt") {}

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.client.get(this.prefix(key));
    return value ? (JSON.parse(value) as T) : undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.client.set(this.prefix(key), JSON.stringify(value), ttlMs ? { PX: ttlMs } : undefined);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.prefix(key));
  }

  private prefix(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }
}
