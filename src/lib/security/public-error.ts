/** Generic client-facing error. Never leak stack traces, SQL, or env details. */
export const PUBLIC_INTERNAL_ERROR = 'Internal Server Error';

export function toPublicErrorMessage(error: unknown): string {
  void error;
  return PUBLIC_INTERNAL_ERROR;
}
