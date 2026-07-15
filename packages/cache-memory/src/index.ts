import type { CacheAdapter } from "@llm-optimize/core";

export class MemoryCache implements CacheAdapter {
  private readonly store = new Map<string, { value: unknown; expiresAt?: number }>();

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
    const entry: { value: unknown; expiresAt?: number } = { value };
    if (ttlMs) {
      entry.expiresAt = Date.now() + ttlMs;
    }
    this.store.set(key, entry);
  }
}
