import { LineBotClient, messagingApi } from '@line/bot-sdk';
import type { DailyReportFlexMessage } from '@/lib/line/daily-report-flex';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

const client = channelAccessToken
  ? LineBotClient.fromChannelAccessToken({ channelAccessToken })
  : null;

export type LinePushResult =
  | { success: true; response: unknown }
  | { success: false; error: string; details?: unknown };

export type LinePushMessage =
  | { type: 'text'; text: string }
  | DailyReportFlexMessage;

/**
 * Internal LINE push — for cron routes and authenticated server actions only.
 * Callers must enforce auth before invoking.
 */
export async function pushLineMessages(
  targetId: string,
  messages: LinePushMessage[],
): Promise<LinePushResult> {
  if (!targetId || messages.length === 0) {
    const errorMsg = 'Target ID and at least one message are required.';
    console.error('[LINE Push Error]:', errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!client) {
    const errorMsg = 'LINE client is not configured. Missing LINE_CHANNEL_ACCESS_TOKEN.';
    console.error('[LINE Push Error]:', errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const response = await client.pushMessage({
      to: targetId,
      messages: messages as messagingApi.Message[],
    });
    return { success: true, response };
  } catch (err: unknown) {
    const messageText = err instanceof Error ? err.message : 'Unknown error';
    console.error('[LINE Push Failure]:', messageText);
    const details =
      err && typeof err === 'object' && 'originalError' in err
        ? (err as { originalError?: { response?: { data?: unknown } } }).originalError?.response?.data
        : null;
    return {
      success: false,
      error: messageText,
      details: details ?? null,
    };
  }
}

/** Plain-text convenience wrapper for authenticated manual notifications. */
export async function pushLineMessage(
  targetId: string,
  message: string,
): Promise<LinePushResult> {
  return pushLineMessages(targetId, [{ type: 'text', text: message }]);
}
