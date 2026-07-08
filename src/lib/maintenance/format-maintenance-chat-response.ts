import { toDisplayDate } from '@/lib/maintenance/compute-upcoming-maintenance';
import type {
  MaintenanceUrgencyGroup,
  UpcomingMaintenanceTask,
} from '@/lib/maintenance/types';

const GROUP_LABELS: Record<MaintenanceUrgencyGroup, string> = {
  overdue: 'เลยกำหนดแล้ว',
  within_7_days: 'ภายใน 7 วัน',
  within_30_days: 'ภายใน 1 เดือน',
  within_90_days: 'ภายใน 3 เดือน',
  later: 'อนาคต (มากกว่า 3 เดือน)',
};

const GROUP_ORDER: MaintenanceUrgencyGroup[] = [
  'overdue',
  'within_7_days',
  'within_30_days',
  'within_90_days',
  'later',
];

export function formatMaintenanceChatResponse(tasks: UpcomingMaintenanceTask[]): string {
  if (tasks.length === 0) {
    return 'ไม่มีรายการซ่อมบำรุงที่ค้างอยู่ในขณะนี้ อุปกรณ์ทุกรายการอยู่ในสถานะปกติค่ะ';
  }

  const grouped = new Map<MaintenanceUrgencyGroup, UpcomingMaintenanceTask[]>();
  for (const group of GROUP_ORDER) {
    grouped.set(group, []);
  }

  for (const task of tasks) {
    grouped.get(task.urgency)?.push(task);
  }

  const lines: string[] = ['🔧 งานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้', ''];
  let itemNumber = 1;

  for (const group of GROUP_ORDER) {
    const groupTasks = grouped.get(group) ?? [];
    if (groupTasks.length === 0) continue;

    lines.push(`${GROUP_LABELS[group]} (${groupTasks.length} งาน)`);

    for (const task of groupTasks) {
      lines.push(
        `${itemNumber}. ${toDisplayDate(task.dueDate)} | ${task.equipment}`,
        `   ${task.advice}`,
      );
      itemNumber += 1;
    }

    lines.push('');
  }

  lines.push(`รวม ${tasks.length} งานค่ะ`);

  return lines.join('\n').trim();
}
