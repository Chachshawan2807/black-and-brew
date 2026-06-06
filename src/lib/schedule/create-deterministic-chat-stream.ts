import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

export function createDeterministicChatStreamResponse(text: string): Response {
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: 'start' });
      writer.write({ type: 'start-step' });
      writer.write({ type: 'text-start', id: 'deterministic-response' });
      writer.write({ type: 'text-delta', id: 'deterministic-response', delta: text });
      writer.write({ type: 'text-end', id: 'deterministic-response' });
      writer.write({ type: 'finish-step' });
      writer.write({ type: 'finish' });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
