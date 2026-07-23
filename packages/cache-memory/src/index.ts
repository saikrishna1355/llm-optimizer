import type { CacheAdapter } from "@llm-optimize/core";

export interface MemoryCacheOptions {
  maxSize?: number; // max number of entries, default 500
}

export class MemoryCache implements CacheAdapter {
  private readonly store = new Map<string, { value: unknown; expiresAt?: number }>();
  private readonly maxSize: number;

  constructor(options: MemoryCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 500;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    // Fix #20: evict oldest entry when at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    const entry: { value: unknown; expiresAt?: number } = { value };
    if (ttlMs) entry.expiresAt = Date.now() + ttlMs;
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}
