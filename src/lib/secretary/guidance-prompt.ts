import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { collectGuidanceTasks } from '@/lib/secretary/guidance-fingerprint';
import { SECRETARY_BRU_IDENTITY } from '@/lib/secretary/guidance-voice';
import {
  buildWorkSessionPromptLines,
  formatGuidanceStep,
  groupTasksIntoGuidanceSteps,
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
): string {
  const actionable = collectGuidanceTasks(tasks, nowIso, {
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
    if (task.description) parts.push(`รายละเอียด: ${task.description}`);
    return parts.join(' | ');
  });

  const guidanceSteps = groupTasksIntoGuidanceSteps(actionable).map((step) => formatGuidanceStep(step));

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
    'Work sessions (งานที่ทำบนหน้าเดียวกัน — แนะนำรวมเป็นขั้นตอนเดียว):',
    ...buildWorkSessionPromptLines().map((line) => `- ${line}`),
    '',
    'ขั้นตอนที่ระบบคาดหวัง (รวม work session แล้ว):',
    guidanceSteps.length > 0 ? guidanceSteps.join(' แล้วต่อด้วย ') : '- ไม่มีงานค้าง',
    '',
    'ตอบภาษาไทย 1 ประโยคเดียว แนะนำตามขั้นตอนด้านบน คั่นแต่ละขั้นต้นด้วย "แล้วต่อด้วย" งานใน work session เดียวกันให้รวมเป็นขั้นตอนเดียว (ใช้ "และ" ภายในวงเล็บ) ห้ามแยก work session เป็นหลายขั้นตอน ลงท้ายด้วย "ค่ะ" หรือ "นะคะ"',
  ].join('\n');
}

export const SECRETARY_GUIDANCE_SYSTEM = `${SECRETARY_BRU_IDENTITY}
ตอบสั้น กระชับ เป็นภาษาไทย 1 ประโยคเดียว
แนะนำตามขั้นตอน (work session) ไม่ใช่ตามจำนวนการ์ด — งานใน work session เดียวกันรวมเป็นขั้นตอนเดียวด้วย "และ" ในวงเล็บ
คั่นแต่ละขั้นตอนด้วย "แล้วต่อด้วย" และใส่ในเครื่องหมายคำพูดตามตัวอย่างขั้นตอนที่ระบบให้
ให้ความสำคัญกับงานที่กำลังทำอยู่ งานเร่งด่วน งานที่เกี่ยวกับสาขา 2 ในวันไปสาขา 2 และงานคลังที่กระทบการขาย
ห้ามใช้ markdown หรือ bullet list ห้ามข้ามขั้นตอนในรายการ`;
