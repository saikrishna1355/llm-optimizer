import { LLMOptimizer } from "@llm-optimizer/core";

const ai = new LLMOptimizer({ provider: "openai", optimize: true });

void ai.chat({
  model: "gpt-5",
  messages: [{ role: "user", content: "Summarize the project." }],
});
