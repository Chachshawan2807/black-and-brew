import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { isManualSecretaryTask } from '@/lib/secretary/is-manual-task';
import type { SecretaryTask } from '@/lib/secretary/types';

const ROOT = path.resolve(__dirname, '..');

function task(partial: Partial<SecretaryTask>): SecretaryTask {
  return {
    id: 'task-1',
    task_type: 'custom',
    title: 'งานทดสอบ',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-08-28',
    assignee_profile_id: null,
    source_kind: 'manual',
    source_ref: null,
    source_ref_hash: null,
    action_href: null,
    metadata: null,
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: '2026-08-28T00:00:00.000Z',
    updated_at: '2026-08-28T00:00:00.000Z',
    ...partial,
  };
}

describe('isManualSecretaryTask', () => {
  test('returns true for manual custom tasks', () => {
    expect(isManualSecretaryTask(task({ source_kind: 'manual' }))).toBe(true);
  });

  test('returns false for derived tasks', () => {
    expect(isManualSecretaryTask(task({ source_kind: 'derived', task_type: 'inventory_reorder' }))).toBe(
      false,
    );
  });
});

describe('secretary manual task UI', () => {
  test('exports updateManualSecretaryTask server action', () => {
    const actions = fs.readFileSync(path.resolve(ROOT, 'app/actions/secretary-actions.ts'), 'utf-8');
    expect(actions).toContain('export async function updateManualSecretaryTask');
    expect(actions).toMatch(/\.eq\('source_kind', 'manual'\)/);
  });

  test('SecretaryManualTaskDialog supports title, description, save and delete', () => {
    const dialog = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryManualTaskDialog.tsx'),
      'utf-8',
    );
    expect(dialog).toContain('รายละเอียด');
    expect(dialog).toContain('onSave');
    expect(dialog).toContain('onDelete');
    expect(dialog).toContain('textarea');
  });

  test('SecretaryClient opens manual task dialog for create with description', () => {
    const client = fs.readFileSync(path.resolve(ROOT, 'app/[locale]/secretary/SecretaryClient.tsx'), 'utf-8');
    expect(client).toContain('SecretaryManualTaskDialog');
    expect(client).toContain('createManualSecretaryTask');
    expect(client).toContain('newDescription');
  });

  test('SecretaryTaskOverlay routes manual tasks to editable dialog', () => {
    const overlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskOverlay.tsx'),
      'utf-8',
    );
    expect(overlay).toContain('isManualSecretaryTask');
    expect(overlay).toContain('SecretaryManualTaskDialog');
    expect(overlay).toContain('updateManualSecretaryTask');
    expect(overlay).toContain('deleteManualSecretaryTask');
  });

  test('secretary task overlays use centered modal layout by default', () => {
    const layout = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/secretary-modal-layout.ts'),
      'utf-8',
    );
    expect(layout).toContain('items-center justify-center');
    expect(layout).toContain('SECRETARY_MODAL_SCAFFOLD_PROPS');

    for (const file of [
      'SecretaryTaskSubwindow.tsx',
      'SecretaryManualTaskDialog.tsx',
      'BeanOrdersOverlay.tsx',
      'BranchWithdrawOverlay.tsx',
    ]) {
      const code = fs.readFileSync(
        path.resolve(ROOT, `app/[locale]/secretary/_components/${file}`),
        'utf-8',
      );
      if (file === 'SecretaryTaskSubwindow.tsx' || file === 'SecretaryManualTaskDialog.tsx') {
        expect(code).toContain('SECRETARY_MODAL_SCAFFOLD_PROPS');
      } else {
        expect(code).toContain('SecretaryTaskSubwindow');
      }
      expect(code).not.toContain('items-end');
    }
  });
});
