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
  /** Defaults to RAW (plain text names). Use USER_ENTERED for formulas. */
  inputOption?: 'RAW' | 'USER_ENTERED';
}

export interface GoogleSheetsClient {
  spreadsheetId: string;
  accessToken: string;
  account: GoogleServiceAccount;
}

export function isGoogleSheetsSyncConfigured(): boolean {
  try {
    return Boolean(getGoogleSheetsSpreadsheetId() && loadGoogleServiceAccountFromEnv());
  } catch {
    return false;
  }
}

function resolveSheetsClient(client?: GoogleSheetsClient): {
  spreadsheetId: string;
  accessTokenPromise: Promise<string>;
  account: GoogleServiceAccount;
} {
  const spreadsheetId = client?.spreadsheetId ?? getGoogleSheetsSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  }

  const account = client?.account ?? loadGoogleServiceAccountFromEnv();
  if (!account) {
    throw new Error('Missing Google service account credentials');
  }

  const accessTokenPromise = client
    ? Promise.resolve(client.accessToken)
    : getGoogleServiceAccountAccessToken(account);

  return { spreadsheetId, accessTokenPromise, account };
}

export async function createGoogleSheetsClient(): Promise<GoogleSheetsClient> {
  const spreadsheetId = getGoogleSheetsSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  }

  const account = loadGoogleServiceAccountFromEnv();
  if (!account) {
    throw new Error('Missing Google service account credentials');
  }

  const accessToken = await getGoogleServiceAccountAccessToken(account);
  return { spreadsheetId, accessToken, account };
}

async function batchUpdateValues(
  spreadsheetId: string,
  accessToken: string,
  updates: SheetsValueUpdate[],
  valueInputOption: 'RAW' | 'USER_ENTERED',
): Promise<void> {
  if (updates.length === 0) return;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption,
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
  client?: GoogleSheetsClient,
): Promise<string[][]> {
  const { spreadsheetId, accessTokenPromise } = resolveSheetsClient(client);
  const accessToken = await accessTokenPromise;
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

/** Read many A1 ranges in one Google Sheets API round trip. */
export async function batchReadGoogleSheetValues(
  ranges: string[],
  client?: GoogleSheetsClient,
): Promise<string[][][]> {
  if (ranges.length === 0) return [];

  const { spreadsheetId, accessTokenPromise } = resolveSheetsClient(client);
  const accessToken = await accessTokenPromise;
  const query = ranges.map((range) => `ranges=${encodeURIComponent(range)}`).join('&');
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${query}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheets batchGet failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    valueRanges?: Array<{ values?: string[][] }>;
  };

  return (data.valueRanges ?? []).map((entry) => entry.values ?? []);
}

export async function listGoogleSheetTabTitles(client?: GoogleSheetsClient): Promise<string[]> {
  const { spreadsheetId, accessTokenPromise } = resolveSheetsClient(client);
  const accessToken = await accessTokenPromise;
  return fetchSpreadsheetMetadata(spreadsheetId, accessToken);
}

export async function clearGoogleSheetRanges(
  ranges: string[],
  client?: GoogleSheetsClient,
): Promise<void> {
  if (ranges.length === 0) return;

  const { spreadsheetId, accessTokenPromise } = resolveSheetsClient(client);
  const accessToken = await accessTokenPromise;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ranges }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Sheets batchClear failed (${response.status}): ${detail}`);
  }
}

export async function writeGoogleSheetUpdates(
  updates: SheetsValueUpdate[],
  client?: GoogleSheetsClient,
): Promise<void> {
  if (updates.length === 0) return;

  const { spreadsheetId, accessTokenPromise } = resolveSheetsClient(client);
  const accessToken = await accessTokenPromise;

  const rawUpdates = updates.filter((entry) => (entry.inputOption ?? 'RAW') === 'RAW');
  const userEnteredUpdates = updates.filter((entry) => entry.inputOption === 'USER_ENTERED');

  await Promise.all([
    rawUpdates.length > 0
      ? batchUpdateValues(spreadsheetId, accessToken, rawUpdates, 'RAW')
      : Promise.resolve(),
    userEnteredUpdates.length > 0
      ? batchUpdateValues(spreadsheetId, accessToken, userEnteredUpdates, 'USER_ENTERED')
      : Promise.resolve(),
  ]);
}

export function quoteSheetRange(tabName: string, a1Range: string): string {
  const escaped = tabName.replace(/'/g, "''");
  return `'${escaped}'!${a1Range}`;
}

export function getConfiguredSheetTabNameOverride(): string | null {
  return getGoogleSheetsTabNameOverride();
}
