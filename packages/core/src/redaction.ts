const REDACTIONS: Array<[RegExp, string]> = [
  [/\bsk-[A-Za-z0-9]{16,}\b/g, "[REDACTED_API_KEY]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_KEY]"],
  [/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\b/g, "[REDACTED_JWT]"],
  [/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_CREDIT_CARD]"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
  [/\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/g, "[REDACTED_PHONE]"]
];

export function redactSensitiveText(input: string): string {
  return REDACTIONS.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), input);
}
