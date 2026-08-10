import { getGoogleServiceAccountAccessToken } from '@/lib/google/service-account-token';
import {
  getGoogleSheetsSpreadsheetId,
  getGoogleSheetsTabNameOverride,
  loadGoogleServiceAccountFromEnv,
  type GoogleServiceAccount,
} from '@/lib/google/service-account-config';

export interface SheetsValueUpdate {
  range: string;
  values: string[][];
}

export function isGoogleSheetsSyncConfigured(): boolean {
  try {
    return Boolean(getGoogleSheetsSpreadsheetId() && loadGoogleServiceAccountFromEnv());
  } catch {
    return false;
  }
}

async function batchUpdateValues(
  spreadsheetId: string,
  accessToken: string,
  updates: SheetsValueUpdate[],
): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: updates.map((entry) => ({
          range: entry.range,
          majorDimension: 'ROWS',
          values: entry.values,
        })),
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheets batchUpdate failed (${response.status}): ${detail}`);
  }
}

async function fetchSpreadsheetMetadata(spreadsheetId: string, accessToken: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheets metadata failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  return (data.sheets ?? [])
    .map((sheet) => sheet.properties?.title?.trim())
    .filter((title): title is string => Boolean(title));
}

export async function readGoogleSheetValues(
  range: string,
  account?: GoogleServiceAccount,
): Promise<string[][]> {
  const spreadsheetId = getGoogleSheetsSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  }

  const credentials = account ?? loadGoogleServiceAccountFromEnv();
  if (!credentials) {
    throw new Error('Missing Google service account credentials');
  }

  const accessToken = await getGoogleServiceAccountAccessToken(credentials);
  const encodedRange = encodeURIComponent(range);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheets read failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as { values?: string[][] };
  return data.values ?? [];
}

export async function listGoogleSheetTabTitles(account?: GoogleServiceAccount): Promise<string[]> {
  const spreadsheetId = getGoogleSheetsSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  }

  const credentials = account ?? loadGoogleServiceAccountFromEnv();
  if (!credentials) {
    throw new Error('Missing Google service account credentials');
  }

  const accessToken = await getGoogleServiceAccountAccessToken(credentials);
  return fetchSpreadsheetMetadata(spreadsheetId, accessToken);
}

export async function writeGoogleSheetUpdates(
  updates: SheetsValueUpdate[],
  account?: GoogleServiceAccount,
): Promise<void> {
  const spreadsheetId = getGoogleSheetsSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  }

  const credentials = account ?? loadGoogleServiceAccountFromEnv();
  if (!credentials) {
    throw new Error('Missing Google service account credentials');
  }

  const accessToken = await getGoogleServiceAccountAccessToken(credentials);
  await batchUpdateValues(spreadsheetId, accessToken, updates);
}

export function quoteSheetRange(tabName: string, a1Range: string): string {
  const escaped = tabName.replace(/'/g, "''");
  return `'${escaped}'!${a1Range}`;
}

export function getConfiguredSheetTabNameOverride(): string | null {
  return getGoogleSheetsTabNameOverride();
}
