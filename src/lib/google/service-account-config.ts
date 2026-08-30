import { z } from 'zod';

const serviceAccountSchema = z.object({
  type: z.literal('service_account'),
  project_id: z.string(),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string().email(),
  client_id: z.string(),
  auth_uri: z.string().url(),
  token_uri: z.string().url(),
});

export type GoogleServiceAccount = z.infer<typeof serviceAccountSchema>;

export function parseGoogleServiceAccountJson(raw: string): GoogleServiceAccount {
  const parsed = JSON.parse(raw) as unknown;
  return serviceAccountSchema.parse(parsed);
}

export function loadGoogleServiceAccountFromEnv(): GoogleServiceAccount | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      return parseGoogleServiceAccountJson(json);
    } catch (error) {
      console.error(
        'Invalid GOOGLE_SERVICE_ACCOUNT_JSON falling back to split env vars:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!email || !privateKey) return null;

  return {
    type: 'service_account',
    project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID?.trim() || 'schedule-holiday-autosync',
    private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID?.trim() || 'local',
    private_key: privateKey.replace(/\\n/g, '\n'),
    client_email: email,
    client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID?.trim() || '0',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  };
}

export function getGoogleSheetsSpreadsheetId(): string | null {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  return id || null;
}

export function getGoogleSheetsTabNameOverride(): string | null {
  const name = process.env.GOOGLE_SHEETS_TAB_NAME?.trim();
  return name || null;
}
