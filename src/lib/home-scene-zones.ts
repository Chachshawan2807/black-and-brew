import type { SecretaryTask } from '@/lib/secretary/types';

export type HomeSceneZoneId = 'service' | 'inventory' | 'orders' | 'maintenance';

export type HomeSceneZone<TTask extends Pick<SecretaryTask, 'module' | 'status'>> = {
  id: HomeSceneZoneId;
  label: string;
  description: string;
  tasks: TTask[];
  activeCount: number;
};

const ZONE_DEFINITIONS = [
  {
    id: 'service',
    label: 'หน้าบาร์',
    description: 'กะงานและการจัดทีม',
    modules: ['schedule', 'dashboard', 'branch2', 'custom'],
  },
  {
    id: 'inventory',
    label: 'ชั้นวัตถุดิบ',
    description: 'สต็อกและการตรวจนับ',
    modules: ['inventory', 'inventory_count', 'inventory_accuracy', 'branch_withdraw'],
  },
  {
    id: 'orders',
    label: 'จุดรับออเดอร์',
    description: 'คำสั่งซื้อเมล็ดกาแฟ',
    modules: ['bean_orders'],
  },
  {
    id: 'maintenance',
    label: 'มุมดูแลร้าน',
    description: 'บำรุงรักษาอุปกรณ์และพื้นที่',
    modules: ['maintenance'],
  },
] as const satisfies ReadonlyArray<{
  id: HomeSceneZoneId;
  label: string;
  description: string;
  modules: readonly SecretaryTask['module'][];
}>;

export function groupTasksIntoHomeSceneZones<
  TTask extends Pick<SecretaryTask, 'module' | 'status'> & { consolidatedTaskIds?: string[] },
>(tasks: TTask[]): HomeSceneZone<TTask>[] {
  return ZONE_DEFINITIONS.map((definition) => {
    const zoneTasks = tasks.filter((task) =>
      (definition.modules as readonly SecretaryTask['module'][]).includes(task.module),
    );

    return {
      id: definition.id,
      label: definition.label,
      description: definition.description,
      tasks: zoneTasks,
      activeCount: zoneTasks.reduce((count, task) => {
        if (task.status !== 'pending' && task.status !== 'in_progress') return count;
        return count + Math.max(1, task.consolidatedTaskIds?.length ?? 0);
      }, 0),
    };
  });
}
