'use server';

import { LineBotClient } from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// Initialize the LINE client only if the access token is present
const client = channelAccessToken
  ? LineBotClient.fromChannelAccessToken({ channelAccessToken })
  : null;

/**
 * Sends a push notification to a LINE target ID (User ID, Group ID, or Room ID).
 * 
 * @param targetId The LINE recipient ID.
 * @param message The text message to send.
 * @returns An object indicating success status or error details.
 */
export async function sendLineNotification(targetId: string, message: string) {
  if (!targetId || !message) {
    const errorMsg = 'Target ID and message content are required.';
    console.error('[LINE Action Error]:', errorMsg);
    return { success: false, error: errorMsg };
  }

  if (!client) {
    const errorMsg = 'LINE client is not configured. Missing LINE_CHANNEL_ACCESS_TOKEN.';
    console.error('[LINE Action Error]:', errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const response = await client.pushMessage({
      to: targetId,
      messages: [
        {
          type: 'text',
          text: message,
        },
      ],
    });

    // Keep production logs minimal.
    return { success: true, response };
  } catch (err: any) {
    console.error('[LINE Action Failure]:', err.message || err);
    if (err.originalError?.response?.data) {
      console.error('[LINE API Response Error]:', err.originalError.response.data);
    }
    return {
      success: false,
      error: err.message || 'Unknown error occurred while sending LINE notification.',
      details: err.originalError?.response?.data || null,
    };
  }
}
