/** Generic client-facing error. Never leak stack traces, SQL, or env details. */
export const PUBLIC_INTERNAL_ERROR = 'Internal Server Error';

export function toPublicErrorMessage(_error: unknown): string {
  return PUBLIC_INTERNAL_ERROR;
}
