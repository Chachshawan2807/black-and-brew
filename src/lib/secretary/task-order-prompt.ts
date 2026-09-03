import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { collectGuidanceTasks } from '@/lib/secretary/guidance-fingerprint';
import { SECRETARY_BRU_IDENTITY } from '@/lib/secretary/guidance-voice';
import {
  buildWorkSessionPromptLines,
  resolveWorkSession,
} from '@/lib/secretary/task-work-sessions';
import {
  buildSecretaryTimeContext,
  WORKDAY_PHASE_LABELS,
  type SecretaryTimeContext,
} from '@/lib/secretary/task-order-time-context';

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

export const SECRETARY_TASK_ORDER_PLAYBOOK = `
หลักการจัดลำดับงาน BLACKANDBREW (ยืดหยุ่นตามบริบท):
- งานที่กำลังทำอยู่ต้องอยู่อันดับแรกเสมอ (ระบบ pin ให้แล้ว จัดเฉพาะงานที่เหลือ)
- วันไปสาขา 2: คั่ว/เบิกของสาขา 2 สำคัญก่อนเปิดหรือก่อนเดินทาง
- ก่อนเปิดร้าน: เตรียมของขายไม่ได้, จัดคน/ตาราง, คั่ว, เบิกสาขา
- เปิดร้านแล้ว: สั่งซื้อสินค้า (ทำได้ทันที ใช้เวลาไม่นาน) ก่อนงานซ่อมบำรุง ซ่อมมักต้องรอลูกค้าไม่มีในร้าน จึงไม่เร่งก่อนงานคลังด่วน
- เปิดร้านแล้ว: ออเดอร์เมล็ดค้าง หลังสั่งซื้อสินค้า
- ใกล้ปิดร้าน: สั่งซื้อ/เบิกที่เหลือก่อน แล้วค่อยจัดซ่อมบำรุงเมื่อร้านเงียบ
- คลัง: ของใกล้หมดที่กระทบการขายมาก่อนตรวจนับ/ความแม่นยำ
- งาน work session เดียวกัน (เช่น ตรวจตารางงาน) อยู่หน้าเดียวกัน จัด id ให้ติดกัน ถือว่าทำครั้งเดียว
`.trim();

export const SECRETARY_TASK_ORDER_SYSTEM = `${SECRETARY_BRU_IDENTITY}
คุณจัดลำดับงานประจำวันของร้านกาแฟ
ตอบเป็น JSON เท่านั้น รูปแบบ: {"orderedTaskIds":["id1","id2"]}
ต้องมี id ครบทุกงานในรายการ ไม่ซ้ำ ไม่ขาด ไม่เพิ่ม id ใหม่
${SECRETARY_TASK_ORDER_PLAYBOOK}`;

export function buildSecretaryTaskOrderPrompt(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  timeContext: SecretaryTimeContext = buildSecretaryTimeContext(),
  nowIso = timeContext.nowIso,
): string {
  const actionable = collectGuidanceTasks(tasks, nowIso);
  const inProgress = actionable.find((task) => task.status === 'in_progress');

  const lines = actionable.map((task, index) => {
    const session = resolveWorkSession(task);
    const parts = [
      `id: ${task.id}`,
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

  const context = [
    `วันที่งาน: ${snapshot.dateIso}`,
    `เวลาปัจจุบัน (Bangkok): ${timeContext.bangkokTime}`,
    `ช่วงวัน: ${WORKDAY_PHASE_LABELS[timeContext.phase]} (${timeContext.phase})`,
    `วันไปสาขา 2: ${snapshot.isBranch2Day ? 'ใช่' : 'ไม่'}`,
    `คนในสาขาวันนี้: ${snapshot.headcountToday}`,
    `รายการสั่งซื้อคลัง: ${snapshot.itemsToOrder.length}`,
    `รายการเบิกสาขา 2: ${snapshot.branchWithdrawItems.length}`,
    `ซ่อมบำรุงเลยกำหนด: ${snapshot.maintenanceTasks.filter((item) => item.urgency === 'overdue').length}`,
    `ออเดอร์เมล็ดค้าง: ${snapshot.operational.pendingBeanOrders.length}`,
    `พนักงานลา: ${snapshot.operational.leaveCount}`,
  ];

  return [
    'บริบทร้านกาแฟ BLACKANDBREW:',
    ...context.map((line) => `- ${line}`),
    '',
    inProgress
      ? `งานที่กำลังทำ (ต้องอยู่อันดับแรก): ${inProgress.title} (${inProgress.id})`
      : 'ไม่มีงานที่กำลังทำ',
    '',
    'Work sessions (งานที่ทำบนหน้าเดียวกัน จัด id ให้ติดกัน):',
    ...buildWorkSessionPromptLines().map((line) => `- ${line}`),
    '',
    'งานที่ต้องจัดลำดับ:',
    lines.length > 0 ? lines.join('\n') : '- ไม่มีงานค้าง',
    '',
    'ตอบ JSON {"orderedTaskIds":[...]} เรียงจากควรทำก่อน → หลัง ครบทุก id',
  ].join('\n');
}
