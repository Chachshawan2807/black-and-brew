/**
 * ADR: SEC-SANIT-001 — Centralized XSS & Prompt-Injection Sanitization
 * Used by AI chat route, overlay UI, and localStorage hydration.
 */

const XSS_PATTERNS: RegExp[] = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /on\w+="[^"]*"/gi,
  /on\w+='[^']*'/gi,
  /javascript:/gi,
];

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore previous instructions/gi,
  /system prompt/gi,
  /\[INST\]/gi,
  /<\/s>/gi,
  /<\|im_start\|>|<\|im_end\|>/gi,
  /###\s*(system|user|assistant)/gi,
  /forget (all|your|prior)/gi,
  /you are now|act as|jailbreak/gi,
];

/** Strip XSS payloads from user-facing text (chat bubbles, localStorage). */
export function sanitizeXssPayload(text: string): string {
  let sanitized = text;
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  return sanitized;
}

/** Redact prompt-injection patterns before sending text to LLM. */
export function sanitizePromptInput(text: string): string {
  let sanitized = text;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_INJECTION_ATTEMPT]');
  }
  return sanitizeXssPayload(sanitized);
}

/** Sanitize DOM screen context scraped from active modals. */
export function sanitizeScreenContext(text: string, maxLength = 800): string {
  return sanitizePromptInput(
    text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength)
  );
}
