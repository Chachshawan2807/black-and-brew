import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { collectGuidanceTasks } from '@/lib/secretary/guidance-fingerprint';
import { SECRETARY_BRU_IDENTITY } from '@/lib/secretary/guidance-voice';
import {
  buildWorkSessionPromptLines,
  resolveWorkSession,
} from '@/lib/secretary/task-work-sessions';

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
  orderedTasks?: SecretaryTask[],
): string {
  const actionable =
    orderedTasks ??
    collectGuidanceTasks(tasks, nowIso, {
      isBranch2Day: snapshot.isBranch2Day,
    });

  const lines = actionable.map((task, index) => {
    const session = resolveWorkSession(task);
    const parts = [
      `${index + 1}. ${task.title}`,
      `โมดูล: ${MODULE_LABELS[task.module]}`,
      `ความสำคัญ: ${PRIORITY_LABELS[task.priority]}`,
      `สถานะ: ${STATUS_LABELS[task.status]}`,
    ];
    if (session) parts.push(`work session: ${session.label}`);
    if (task.due_at) parts.push(`กำหนด: ${task.due_at}`);
    return parts.join(' | ');
  });

  const inProgress = actionable.find((t) => t.status === 'in_progress');
  const urgentCount = actionable.filter((t) => t.priority === 'urgent').length;

  const context = [
    `วันที่งาน: ${snapshot.dateIso}`,
    `วันไปสาขา 2: ${snapshot.isBranch2Day ? 'ใช่' : 'ไม่'}`,
    `คนในสาขาวันนี้: ${snapshot.headcountToday}`,
    `งานค้างทั้งหมด: ${actionable.length}`,
    `งานเร่งด่วน: ${urgentCount}`,
    `รายการสั่งซื้อคลัง: ${snapshot.itemsToOrder.length}`,
    `รายการเบิกสาขา 2: ${snapshot.branchWithdrawItems.length}`,
    `ซ่อมบำรุงเลยกำหนด: ${snapshot.maintenanceTasks.filter((item) => item.urgency === 'overdue').length}`,
  ];

  return [
    'บริบทร้านกาแฟ BLACKANDBREW:',
    ...context.map((line) => `- ${line}`),
    '',
    inProgress
      ? `งานที่กำลังทำ (ต้องพูดถึง): ${inProgress.title}`
      : actionable.length > 0
        ? `งานแรกที่ควรทำ: ${actionable[0]!.title}`
        : 'ไม่มีงานค้าง',
    '',
    'Work sessions (งานที่ทำบนหน้าเดียวกัน):',
    ...buildWorkSessionPromptLines().map((line) => `- ${line}`),
    '',
    'รายการงาน (เรียงลำดับแล้ว):',
    lines.length > 0 ? lines.join('\n') : '- ไม่มีงานค้าง',
    '',
    'ตอบภาษาไทย 1-2 ประโยคสั้น สรุปว่าวันนี้ควรโฟกัสอะไรก่อน',
    'เน้นงานแรกที่ควรทำ บริบทสาขา 2 หรือเร่งด่วน หรือจำนวนงานค้าง',
    'ห้ามไล่รายการงานทีละข้อ ห้าม bullet/markdown ห้ามคัดลอกชื่องานยาวๆ ทั้งหมด',
    'ไม่เกิน 200 ตัวอักษร ลงท้ายด้วย "ค่ะ" หรือ "นะคะ"',
  ].join('\n');
}

export const SECRETARY_GUIDANCE_SYSTEM = `${SECRETARY_BRU_IDENTITY}
ตอบสั้น กระชับ เป็นภาษาไทย 1-2 ประโยค ไม่เกิน 200 ตัวอักษร
สรุปว่าวันนี้ควรโฟกัสอะไรก่อน ไม่ใช่รายงานรายการงาน
เน้นงานแรกที่ควรทำ งานที่กำลังทำ งานเร่งด่วน วันไปสาขา 2 หรือจำนวนงานค้าง
ห้ามไล่รายการงานทีละข้อ ห้ามใช้ markdown หรือ bullet list ห้ามคัดลอกชื่องานยาวๆ ทั้งหมด`;
