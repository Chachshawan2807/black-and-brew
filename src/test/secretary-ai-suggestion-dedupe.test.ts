import { describe, expect, test } from 'vitest';
import {
  filterNonDuplicateSuggestions,
  findRedundantAiSuggestedTaskIds,
  isDuplicateSuggestion,
  normalizeSuggestionTitle,
} from '@/lib/secretary/dedupe-against-existing';
import type { AiSuggestionRawItem } from '@/lib/secretary/ai-suggestion-types';
import type { SecretaryTask } from '@/lib/secretary/types';

function suggestion(overrides: Partial<AiSuggestionRawItem> = {}): AiSuggestionRawItem {
  return {
    suggestionKey: 'branch2-prep',
    title: 'เตรียมเบิกสาขา 2 ก่อนออก',
    module: 'branch_withdraw',
    priority: 'urgent',
    rationale: 'วันนี้เป็นวันไปสาขา 2 แต่รายการเบิกยังไม่พร้อม',
    ...overrides,
  };
}

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: 'task-1',
    task_type: 'inventory_reorder',
    title: 'สั่งซื้อสินค้า (3 รายการ)',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'inventory',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'derived',
    source_ref: null,
    source_ref_hash: 'hash-1',
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

describe('secretary ai suggestion dedupe', () => {
  test('normalizeSuggestionTitle strips spaces and quotes', () => {
    expect(normalizeSuggestionTitle(' "สั่งซื้อ สินค้า" ')).toBe('สั่งซื้อสินค้า');
  });

  test('isDuplicateSuggestion when derived inventory reorder already exists', () => {
    expect(
      isDuplicateSuggestion(
        suggestion({ module: 'inventory', title: 'ตรวจสต็อกก่อนสั่งซื้อ' }),
        [task({ task_type: 'inventory_reorder', module: 'inventory' })],
      ),
    ).toBe(true);
  });

  test('isDuplicateSuggestion allows cross-module suggestion when module differs', () => {
    expect(
      isDuplicateSuggestion(
        suggestion({ module: 'custom', title: 'ประสานงานคลังกับตารางกะ' }),
        [task({ module: 'inventory', task_type: 'inventory_reorder' })],
      ),
    ).toBe(false);
  });

  test('filterNonDuplicateSuggestions removes duplicate suggestion keys', () => {
    const filtered = filterNonDuplicateSuggestions(
      [
        suggestion({ suggestionKey: 'a', title: 'งาน A' }),
        suggestion({ suggestionKey: 'a', title: 'งาน A ซ้ำ' }),
        suggestion({ suggestionKey: 'b', title: 'งาน B' }),
      ],
      [],
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map((item) => item.suggestionKey)).toEqual(['a', 'b']);
  });

  test('isDuplicateSuggestion when inventory_accuracy_review derived task exists', () => {
    expect(
      isDuplicateSuggestion(
        suggestion({
          module: 'inventory_accuracy',
          title: 'ตรวจความแม่นยำสต็อกอีกครั้ง',
        }),
        [
          task({
            task_type: 'inventory_accuracy_review',
            module: 'inventory_accuracy',
            title: 'ตรวจความแม่นยำสต็อก',
          }),
        ],
      ),
    ).toBe(true);
  });

  test('isDuplicateSuggestion when schedule review session card already exists', () => {
    expect(
      isDuplicateSuggestion(
        suggestion({
          module: 'schedule',
          title: 'ตรวจตารางงานวันนี้',
        }),
        [
          task({
            task_type: 'schedule_understaffed',
            module: 'schedule',
            title: 'ตรวจตารางงาน',
          }),
        ],
      ),
    ).toBe(true);
  });

  test('findRedundantAiSuggestedTaskIds returns AI rows that repeat derived cards', () => {
    const redundantIds = findRedundantAiSuggestedTaskIds([
      task({
        id: 'derived-1',
        task_type: 'inventory_accuracy_review',
        module: 'inventory_accuracy',
        source_kind: 'derived',
      }),
      task({
        id: 'ai-1',
        task_type: 'custom',
        module: 'inventory_accuracy',
        source_kind: 'ai_suggested',
        title: 'ตรวจสต็อกซ้ำ',
        source_ref: { suggestionKey: 'dup-check', rationale: 'ซ้ำกับงาน derived' },
        metadata: { aiSuggested: true, rationale: 'ซ้ำกับงาน derived' },
      }),
    ]);

    expect(redundantIds).toEqual(['ai-1']);
  });
});
