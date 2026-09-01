import { MAX_AI_SUGGESTIONS_PER_DAY } from '@/lib/secretary/ai-suggestion-types';
import { buildGuidanceSnapshotSlice } from '@/lib/secretary/generate-guidance';
import { SECRETARY_BRU_IDENTITY } from '@/lib/secretary/guidance-voice';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export const SECRETARY_AI_SUGGESTION_JSON_EXAMPLE = `{
  "suggestions": [
    {
      "suggestionKey": "branch2-withdraw-prep",
      "title": "เตรียมเบิกสาขา 2 ก่อนออก",
      "module": "branch_withdraw",
      "priority": "urgent",
      "rationale": "วันนี้เป็นวันไปสาขา 2 แต่รายการเบิกยังไม่พร้อม",
      "estimatedMinutes": 20
    }
  ]
}`;

export const SECRETARY_AI_SUGGESTION_SYSTEM = `${SECRETARY_BRU_IDENTITY}

คุณเป็นผู้ช่วยวิเคราะห์งานเชิงรุกของ BLACKANDBREW ERP
เสนอเฉพาะงานใหม่ที่ยังไม่มีในรายการงานปัจจุบัน และทำได้วันนี้
ห้ามซ้ำกับงาน derived หรือ manual ที่มีอยู่
ห้าม hallucinate ตัวเลขหรือรายการที่ไม่มีในบริบท
ตอบเป็น JSON object เดียวเท่านั้น ห้าม markdown ห้ามข้อความนอก JSON
ถ้าไม่มีงานใหม่ให้ตอบ {"suggestions":[]}`;

export function buildAiSuggestionPrompt(
  snapshot: SecretarySnapshot,
  existingTasks: SecretaryTask[],
): string {
  const slice = buildGuidanceSnapshotSlice(snapshot);
  const actionable = existingTasks.filter(
    (task) => task.status === 'pending' || task.status === 'in_progress',
  );

  const existingLines = actionable.map((task, index) => {
    const parts = [
      `${index + 1}. ${task.title}`,
      `source: ${task.source_kind}`,
      `module: ${task.module}`,
      `type: ${task.task_type}`,
      `priority: ${task.priority}`,
    ];
    return parts.join(' | ');
  });

  const maintenanceOverdue = slice.maintenanceTasks.filter((item) => item.urgency === 'overdue').length;

  return [
    'บริบทร้าน:',
    `- วันที่: ${slice.dateIso}`,
    `- วันไปสาขา 2: ${slice.isBranch2Day ? 'ใช่' : 'ไม่'}`,
    `- คนในสาขาวันนี้: ${slice.headcountToday}`,
    `- รายการสั่งซื้อคลัง: ${slice.itemsToOrder.length}`,
    `- รายการเบิกสาขา 2: ${slice.branchWithdrawItems.length}`,
    `- ซ่อมบำรุงเลยกำหนด: ${maintenanceOverdue}`,
    '',
    'งานที่มีอยู่แล้ว (ห้ามเสนอซ้ำ):',
    existingLines.length > 0 ? existingLines.join('\n') : '- ไม่มี',
    '',
    `เสนองานใหม่สูงสุด ${MAX_AI_SUGGESTIONS_PER_DAY} รายการ เน้น cross-module หรือความเสี่ยงที่ rule ยังไม่ครอบคลุม`,
    '',
    'รูปแบบ JSON ที่ต้องตอบ (คัดลอกโครงสร้างนี้เท่านั้น):',
    SECRETARY_AI_SUGGESTION_JSON_EXAMPLE,
  ].join('\n');
}
