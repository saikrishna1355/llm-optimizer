const REDACTIONS: Array<[RegExp, string]> = [
  [/\bsk-[A-Za-z0-9]{16,}\b/g, "[REDACTED_API_KEY]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY]"],
  // AWS secret access key: 40 base64 chars following common env var patterns
  [/(?<=[A-Za-z0-9+/]{39})[A-Za-z0-9+/]{1}(?=[^A-Za-z0-9+/]|$)/g, "[REDACTED_AWS_SECRET]"],
  [/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\b/g, "[REDACTED_JWT]"],
  // Fixed credit card regex — no nested quantifiers, no backtracking risk
  [/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,4}\b/g, "[REDACTED_CREDIT_CARD]"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
  [/\b(?:\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b/g, "[REDACTED_PHONE]"],
];

export function redactSensitiveText(input: string): string {
  return REDACTIONS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), input);
}
