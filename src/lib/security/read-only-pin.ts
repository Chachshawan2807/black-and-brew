/**
 * Read-only PIN from env — never hardcode production credentials in source.
 * Development falls back to 111222 when APP_READ_ONLY_PIN is unset.
 */
export function resolveReadOnlyPin(): string | null {
  const configured = process.env.APP_READ_ONLY_PIN?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[AUTH] APP_READ_ONLY_PIN is required in production');
    return null;
  }

  return '111222';
}
