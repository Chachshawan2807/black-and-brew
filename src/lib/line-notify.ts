import { LineBotClient } from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

const client = channelAccessToken
  ? LineBotClient.fromChannelAccessToken({ channelAccessToken })
  : null;

export type LinePushResult =
  | { success: true; response: unknown }
  | { success: false; error: string; details?: unknown };

/**
 * Internal LINE push — for cron routes and authenticated server actions only.
 * Callers must enforce auth before invoking.
 */
export async function pushLineMessage(
  targetId: string,
  message: string
): Promise<LinePushResult> {
  if (!targetId || !message) {
    const errorMsg = 'Target ID and message content are required.';
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
      messages: [{ type: 'text', text: message }],
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
