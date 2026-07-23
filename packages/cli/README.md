# @llm-optimize/cli

> Command-line tools for analyzing, linting, and benchmarking LLM prompts. Find token waste, duplicate instructions, and quality issues before they reach your model.

[![npm](https://img.shields.io/npm/v/@llm-optimize/cli)](https://www.npmjs.com/package/@llm-optimize/cli)

---

## Install

```bash
npm install -g @llm-optimize/cli
# or use without installing:
npx @llm-optimize/cli <command>
```

---

## Commands

### `analyze` — Inspect a single prompt file

```bash
npx llm-opt analyze prompt.md
```

**Output:**
```json
{
  "file": "prompt.md",
  "promptQualityScore": 87,
  "tokenCount": 342,
  "suggestions": [
    "Compress excess whitespace",
    "Remove 2 duplicate line(s)"
  ]
}
```

- `promptQualityScore` — 0–100, higher is better. Penalizes duplicate lines and excess whitespace.
- `tokenCount` — estimated token count using the same estimator as `@llm-optimize/core`
- `suggestions` — actionable improvements

---

### `lint` — Scan all prompt files in a folder

```bash
npx llm-opt lint prompts/
```

Recursively scans `.md`, `.txt`, and `.prompt` files.

**Output:**
```json
[
  { "file": "prompts/system.md", "score": 95, "suggestions": [] },
  { "file": "prompts/user.md",   "score": 72, "suggestions": ["Compress excess whitespace"] }
]
```

---

### `benchmark` — Measure token savings across a folder

```bash
npx llm-opt benchmark prompts/
```

**Output:**
```json
{
  "files": 8,
  "beforeOptimization": { "tokenCount": 4820 },
  "afterOptimization":  { "tokenCount": 4210 },
  "savedTokens": 610,
  "compressionRatio": 0.873,
  "estimatedMonthlySavingsUsd": 0.0183
}
```

Shows real token savings from whitespace normalization across your actual prompt files.

---

## Supported File Types

| Extension | Description |
|---|---|
| `.md` | Markdown prompt files |
| `.txt` | Plain text prompts |
| `.prompt` | Custom prompt files |

---

## Use in CI

Add to your CI pipeline to catch prompt quality regressions:

```yaml
- name: Lint prompts
  run: npx llm-opt lint prompts/ | jq '.[] | select(.score < 80)'
```

