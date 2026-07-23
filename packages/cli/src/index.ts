#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { estimateRequestTokens } from "@llm-optimize/core";

const [command, target] = process.argv.slice(2);

if (command === "analyze" && target) {
  const content = readFileSync(target, "utf8");
  const tokens = estimateRequestTokens({ model: "unknown", messages: [{ role: "user", content }] });
  console.log(JSON.stringify({ file: target, promptQualityScore: score(content), tokenCount: tokens, suggestions: suggestions(content) }, null, 2));
} else if (command === "lint" && target) {
  const files = collectFiles(target);
  // Fix #19: read each file once
  const results = files.map((file) => {
    const content = readFileSync(file, "utf8");
    return { file, score: score(content), suggestions: suggestions(content) };
  });
  console.log(JSON.stringify(results, null, 2));
} else if (command === "benchmark" && target) {
  // Fix #17: benchmark against real files instead of hardcoded data
  const files = collectFiles(target);
  if (files.length === 0) {
    console.error("No prompt files found in target directory");
    process.exit(1);
  }
  let totalBefore = 0;
  let totalAfter = 0;
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const before = estimateRequestTokens({ model: "unknown", messages: [{ role: "user", content }] });
    const normalized = content.replace(/\s+/g, " ").trim();
    const after = estimateRequestTokens({ model: "unknown", messages: [{ role: "user", content: normalized }] });
    totalBefore += before;
    totalAfter += after;
  }
  const compressionRatio = totalBefore ? totalAfter / totalBefore : 1;
  const savedTokens = totalBefore - totalAfter;
  // estimate at $0.000001 per token
  const estimatedMonthlySavingsUsd = parseFloat((savedTokens * 0.000001 * 30).toFixed(4));
  console.log(JSON.stringify({
    files: files.length,
    beforeOptimization: { tokenCount: totalBefore },
    afterOptimization: { tokenCount: totalAfter },
    savedTokens,
    compressionRatio: parseFloat(compressionRatio.toFixed(3)),
    estimatedMonthlySavingsUsd,
  }, null, 2));
} else {
  console.error("Usage: llm-opt analyze <prompt.md> | lint <prompts/> | benchmark <prompts/>");
  process.exit(1);
}

// Fix #18: score based on line-level duplication ratio, not character vs set size
function score(content: string): number {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return 100;
  const uniqueLines = new Set(lines.map((l) => l.trim()));
  const duplicationRatio = 1 - uniqueLines.size / lines.length;
  const whitespacePenalty = /\s{3,}/.test(content) ? 5 : 0;
  return Math.max(0, Math.round(100 - duplicationRatio * 50 - whitespacePenalty));
}

function suggestions(content: string): string[] {
  const list: string[] = [];
  if (/\s{2,}/.test(content)) list.push("Compress excess whitespace");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const unique = new Set(lines.map((l) => l.trim()));
  if (unique.size < lines.length) list.push(`Remove ${lines.length - unique.size} duplicate line(s)`);
  return list;
}

function collectFiles(target: string): string[] {
  const entries = readdirSync(target, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(target, entry.name);
    if (entry.isDirectory()) return collectFiles(path);
    return [path].filter((file) => [".md", ".txt", ".prompt"].includes(extname(file)));
  });
}
