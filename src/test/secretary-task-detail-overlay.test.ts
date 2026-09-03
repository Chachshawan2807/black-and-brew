import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  canOpenSecretaryTaskDetail,
} from '@/lib/secretary/task-detail-overlay';
import { resolveSecretaryTaskOverlayKind } from '@/lib/secretary/resolve-task-overlay';
import type { SecretaryTask } from '@/lib/secretary/types';

const ROOT = path.resolve(__dirname, '..');

function task(partial: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: 'task-1',
    task_type: 'custom',
    title: 'งานทดสอบ',
    description: 'ตรวจรายการค้าง',
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-09-03',
    assignee_profile_id: null,
    source_kind: 'derived',
    source_ref: null,
    source_ref_hash: null,
    action_href: '/th/inventory',
    metadata: null,
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
    ...partial,
  };
}

describe('canOpenSecretaryTaskDetail', () => {
  test('blocks AI suggested cards because they are advice only', () => {
    expect(canOpenSecretaryTaskDetail(task({ source_kind: 'ai_suggested' }))).toBe(false);
  });

  test('allows derived and manual work cards', () => {
    expect(canOpenSecretaryTaskDetail(task({ source_kind: 'derived' }))).toBe(true);
    expect(canOpenSecretaryTaskDetail(task({ source_kind: 'manual' }))).toBe(true);
  });
});

describe('resolveSecretaryTaskOverlayKind', () => {
  test('does not open a detail overlay for AI suggested cards', () => {
    expect(
      resolveSecretaryTaskOverlayKind(
        task({
          source_kind: 'ai_suggested',
          task_type: 'inventory_reorder',
          module: 'inventory',
        }),
      ),
    ).toBeNull();
  });

  test('retired inventory count tasks fall back to task info', () => {
    expect(
      resolveSecretaryTaskOverlayKind(
        task({ task_type: 'inventory_count_due', module: 'inventory_count' }),
      ),
    ).toBe('task_info');
  });
});

describe('secretary task detail overlay UI', () => {
  test('sub-window baseline avoids route navigation from secretary overlays', () => {
    const overlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskOverlay.tsx'),
      'utf-8',
    );
    const subwindow = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskSubwindow.tsx'),
      'utf-8',
    );
    const infoOverlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskInfoOverlay.tsx'),
      'utf-8',
    );

    expect(overlay).not.toContain('SecretaryListDialog');
    expect(overlay).not.toContain('ScheduleReviewDialog');
    expect(overlay).not.toContain('actionHref');
    expect(overlay).toContain('BeanOrdersOverlay');
    expect(overlay).not.toContain('ScheduleOverlay');
    expect(overlay).toContain('buildScheduleReviewListItems');
    expect(overlay).not.toContain('InventoryCountOverlay');
    expect(overlay).toContain('SecretaryTaskListOverlay');
    expect(overlay).not.toContain('MaintenanceOverlay');
    expect(subwindow).toContain('onClose={onClose}');
    expect(subwindow).toContain('FadeModalScaffold');
    expect(infoOverlay).not.toContain('<Link');
    expect(infoOverlay).not.toContain('href=');
  });

  test('task overlay does not render a detail window for AI suggested cards', () => {
    const overlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskOverlay.tsx'),
      'utf-8',
    );

    expect(overlay).toContain('canOpenSecretaryTaskDetail');
  });

  test('task cards do not open a detail window for AI suggested work', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/SecretaryClient.tsx'),
      'utf-8',
    );

    expect(client).toContain('canOpenSecretaryTaskDetail');
    expect(client).toContain('งานนี้เป็นคำแนะนำ');
  });

  test('maintenance list overlay is read-only without navigation', () => {
    const listOverlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskListOverlay.tsx'),
      'utf-8',
    );

    expect(listOverlay).not.toContain('SECRETARY_TASK_COLORS.attention');
    expect(listOverlay).not.toContain('needsAttention');
    expect(listOverlay).not.toContain('<Link');
    expect(listOverlay).not.toContain('href=');
  });
});
