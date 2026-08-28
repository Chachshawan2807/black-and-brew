import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { collectGuidanceTasks } from '@/lib/secretary/guidance-fingerprint';

const MODULE_LABELS: Record<SecretaryTask['module'], string> = {
  schedule: 'ตารางงาน',
  dashboard: 'แดชบอร์ด',
  inventory: 'คลัง',
  inventory_count: 'ตรวจนับ',
  inventory_accuracy: 'ความแม่นยำ',
  branch_withdraw: 'เบิกสาขา 2',
  bean_orders: 'ออเดอร์เมล็ดกาแฟ',
  maintenance: 'ซ่อมบำรุง',
  branch2: 'สาขา 2',
  custom: 'งานเอง',
};

const PRIORITY_LABELS: Record<SecretaryTask['priority'], string> = {
  urgent: 'เร่งด่วน',
  normal: 'ปกติ',
  low: 'ต่ำ',
};

const STATUS_LABELS: Record<SecretaryTask['status'], string> = {
  pending: 'รอทำ',
  in_progress: 'กำลังทำ',
  done: 'เสร็จ',
  skipped: 'ข้าม',
};

export function buildSecretaryGuidancePrompt(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  nowIso = new Date().toISOString(),
): string {
  const actionable = collectGuidanceTasks(tasks, nowIso);

  const lines = actionable.map((task, index) => {
    const parts = [
      `${index + 1}. ${task.title}`,
      `โมดูล: ${MODULE_LABELS[task.module]}`,
      `ความสำคัญ: ${PRIORITY_LABELS[task.priority]}`,
      `สถานะ: ${STATUS_LABELS[task.status]}`,
    ];
    if (task.due_at) parts.push(`กำหนด: ${task.due_at}`);
    if (task.description) parts.push(`รายละเอียด: ${task.description}`);
    return parts.join(' | ');
  });

  const context = [
    `วันที่งาน: ${snapshot.dateIso}`,
    `วันไปสาขา 2: ${snapshot.isBranch2Day ? 'ใช่' : 'ไม่'}`,
    `คนในสาขาวันนี้: ${snapshot.headcountToday}`,
    `รายการสั่งซื้อคลัง: ${snapshot.itemsToOrder.length}`,
    `รายการเบิกสาขา 2: ${snapshot.branchWithdrawItems.length}`,
    `ซ่อมบำรุงเลยกำหนด: ${snapshot.maintenanceTasks.filter((item) => item.urgency === 'overdue').length}`,
  ];

  return [
    'บริบทร้านกาแฟ BLACKANDBREW:',
    ...context.map((line) => `- ${line}`),
    '',
    'งานที่ต้องจัดการวันนี้:',
    lines.length > 0 ? lines.join('\n') : '- ไม่มีงานค้าง',
    '',
    'ตอบภาษาไทย 1-2 ประโยค แนะนำลำดับงานที่ควรทำก่อน ใช้ชื่องานจากรายการเท่านั้น',
  ].join('\n');
}

export const SECRETARY_GUIDANCE_SYSTEM = `คุณเป็นผู้ช่วยจัดลำดับงานประจำวันของร้านกาแฟ
ตอบสั้น กระชับ เป็นภาษาไทย 1-2 ประโยค
ให้ความสำคัญกับงานที่กำลังทำอยู่ งานเร่งด่วน งานที่เกี่ยวกับสาขา 2 ในวันไปสาขา 2 และงานคลังที่กระทบการขาย
ห้ามใช้ markdown หรือ bullet list`;
