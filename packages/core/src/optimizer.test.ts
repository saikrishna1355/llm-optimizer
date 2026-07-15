import { describe, expect, it } from "vitest";
import { LLMOptimizer } from "./optimizer.js";

describe("LLMOptimizer", () => {
  it("routes and calls provider", async () => {
    const ai = new LLMOptimizer(
      { provider: "openai" },
      {
        chat: async (request) => ({
          model: request.model,
          content: "ok",
          usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
        }),
      },
    );

    const response = await ai.chat({
      model: "gpt-5",
      messages: [{ role: "user", content: "hello hello" }],
    });

    expect(response.content).toBe("ok");
  });
});
