import { describe, expect, it } from "vitest";
import { createOpenAIProviderClient } from "./index.js";

describe("createOpenAIProviderClient", () => {
  it("returns a client with chatCompletions", () => {
    const client = createOpenAIProviderClient({});
    expect(typeof client.chatCompletions).toBe("function");
  });
});
