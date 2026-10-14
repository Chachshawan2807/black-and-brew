import { describe, expect, it } from 'vitest';
import { groupTasksIntoHomeSceneZones } from '@/lib/home-scene-zones';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(id: string, module: SecretaryTask['module'], status: SecretaryTask['status'] = 'pending') {
  return { id, module, status } as SecretaryTask;
}

describe('groupTasksIntoHomeSceneZones', () => {
  it('maps operational work into the four shop objects', () => {
    const zones = groupTasksIntoHomeSceneZones([
      task('schedule', 'schedule'),
      task('dashboard', 'dashboard'),
      task('inventory', 'inventory'),
      task('count', 'inventory_count'),
      task('orders', 'bean_orders'),
      task('maintenance', 'maintenance'),
      task('branch2', 'branch2'),
      task('custom', 'custom'),
    ]);

    expect(zones.map(({ id, tasks }) => [id, tasks.map(({ id: taskId }) => taskId)])).toEqual([
      ['service', ['schedule', 'dashboard', 'branch2', 'custom']],
      ['inventory', ['inventory', 'count']],
      ['orders', ['orders']],
      ['maintenance', ['maintenance']],
    ]);
  });

  it('counts only pending work as active while retaining completed rows for context', () => {
    const [service] = groupTasksIntoHomeSceneZones([
      task('pending', 'schedule'),
      task('done', 'schedule', 'done'),
      task('skipped', 'schedule', 'skipped'),
    ]);

    expect(service?.tasks).toHaveLength(3);
    expect(service?.activeCount).toBe(1);
  });

  it('counts underlying tasks when a visible row consolidates several tasks', () => {
    const zones = groupTasksIntoHomeSceneZones([
      { ...task('maintenance', 'maintenance'), consolidatedTaskIds: ['m1', 'm2', 'm3'] },
    ]);

    expect(zones.find(({ id }) => id === 'maintenance')?.activeCount).toBe(3);
  });
});
