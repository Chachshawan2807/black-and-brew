import { describe, expect, test } from 'vitest';
import {
  extractAiSuggestionPayload,
  parseAiSuggestionItem,
  parseAiSuggestionResponse,
  resolveAiSuggestedDrafts,
  resolveAiSuggestedDraftsFromSchemaItems,
} from '@/lib/secretary/ai-suggestion-quality';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: overrides.id ?? 'task-1',
    task_type: overrides.task_type ?? 'custom',
    title: overrides.title ?? 'งานทดสอบ',
    description: null,
    priority: overrides.priority ?? 'normal',
    status: overrides.status ?? 'pending',
    module: overrides.module ?? 'custom',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: overrides.source_kind ?? 'manual',
    source_ref: null,
    source_ref_hash: null,
    action_href: null,
    metadata: null,
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('secretary ai suggestion quality', () => {
  test('rejects invalid module and empty title', () => {
    expect(
      parseAiSuggestionItem({
        suggestionKey: 'branch2-prep',
        title: '',
        module: 'invalid',
        priority: 'normal',
        rationale: 'เตรียมของก่อนออกสาขา 2',
      }),
    ).toBeNull();
  });

  test('rejects markdown in rationale', () => {
    expect(
      parseAiSuggestionItem({
        suggestionKey: 'cross-1',
        title: 'เช็คคลังก่อนเบิกสาขา 2',
        module: 'branch_withdraw',
        priority: 'urgent',
        rationale: '- รายการ 1\n- รายการ 2',
      }),
    ).toBeNull();
  });

  test('accepts valid Thai suggestion payload', () => {
    const item = parseAiSuggestionItem({
      suggestionKey: 'branch2-prep',
      title: 'เตรียมเบิกสาขา 2 ก่อนออก',
      module: 'branch_withdraw',
      priority: 'urgent',
      rationale: 'วันนี้เป็นวันไปสาขา 2 แต่รายการเบิกยังไม่พร้อม',
      estimatedMinutes: 20,
      actionHref: '/th/inventory/branch-withdraw',
    });

    expect(item).toMatchObject({
      suggestionKey: 'branch2-prep',
      title: 'เตรียมเบิกสาขา 2 ก่อนออก',
      priority: 'urgent',
    });
  });

  test('parseAiSuggestionResponse returns empty array for prose-only AI output', () => {
    expect(parseAiSuggestionResponse('วันนี้ไม่มีงานเพิ่มเติมที่ควรทำค่ะ')).toEqual([]);
  });

  test('parseAiSuggestionResponse reads JSON inside markdown fence', () => {
    const items = parseAiSuggestionResponse(
      '```json\n' +
        JSON.stringify({
          suggestions: [
            {
              suggestionKey: 'b',
              title: 'งาน B',
              module: 'custom',
              priority: 'normal',
              rationale: 'เหตุผล B',
            },
          ],
        }) +
        '\n```',
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.suggestionKey).toBe('b');
  });

  test('extractAiSuggestionPayload never throws on invalid text', () => {
    expect(extractAiSuggestionPayload('not json at all')).toBeNull();
  });

  test('parseAiSuggestionResponse reads suggestions array', () => {
    const items = parseAiSuggestionResponse(
      JSON.stringify({
        suggestions: [
          {
            suggestionKey: 'a',
            title: 'งาน A',
            module: 'custom',
            priority: 'normal',
            rationale: 'เหตุผล A',
          },
        ],
      }),
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.suggestionKey).toBe('a');
  });

  test('resolveAiSuggestedDrafts caps at three items', () => {
    const raw = Array.from({ length: 5 }, (_, index) => ({
      suggestionKey: `key-${index}`,
      title: `งานแนะนำ ${index}`,
      module: 'custom' as const,
      priority: 'normal' as const,
      rationale: `เหตุผล ${index}`,
    }));

    const drafts = resolveAiSuggestedDrafts(raw, []);
    expect(drafts).toHaveLength(3);
    expect(drafts[0]?.metadata.aiSuggested).toBe(true);
    expect(drafts[0]?.sourceRefHash).toHaveLength(32);
  });

  test('resolveAiSuggestedDrafts drops duplicate title against existing task', () => {
    const drafts = resolveAiSuggestedDrafts(
      [
        {
          suggestionKey: 'dup',
          title: 'สั่งซื้อสินค้า (3 รายการ)',
          module: 'inventory',
          priority: 'normal',
          rationale: 'ควรสั่งซื้อเพิ่ม',
        },
      ],
      [task({ title: 'สั่งซื้อสินค้า (3 รายการ)', source_kind: 'derived', module: 'inventory' })],
    );

    expect(drafts).toHaveLength(0);
  });

  test('resolveAiSuggestedDraftsFromSchemaItems accepts zod-shaped items', () => {
    const drafts = resolveAiSuggestedDraftsFromSchemaItems(
      [
        {
          suggestionKey: 'schema-1',
          title: 'เช็คคลังก่อนเบิกสาขา 2',
          module: 'branch_withdraw',
          priority: 'urgent',
          rationale: 'มีของรอเบิกและสต็อกต่ำ',
        },
      ],
      [],
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.taskType).toBe('custom');
  });
});
