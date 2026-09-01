import type { AiSuggestionRawItem } from '@/lib/secretary/ai-suggestion-types';
import { normalizeSuggestionTitle } from '@/lib/secretary/dedupe-against-existing';
import type { SecretaryTask } from '@/lib/secretary/types';

/** Operational topics: AI must not suggest when an actionable card already covers the same topic. */
export type SuggestionTopic =
  | 'branch_withdraw'
  | 'branch2_day'
  | 'inventory_reorder'
  | 'inventory_count'
  | 'inventory_accuracy'
  | 'schedule'
  | 'bean_orders'
  | 'maintenance';

const CORE_PHRASES = [
  'เบิกสาขา2',
  'เบิกของสาขา2',
  'เบิกสาขา',
  'สั่งซื้อสินค้า',
  'สั่งซื้อ',
  'ตรวจนับสต็อก',
  'ตรวจนับ',
  'ตรวจความแม่นยำ',
  'ความแม่นยำสต็อก',
  'ตรวจตารางงาน',
  'ตารางงาน',
  'ออเดอร์เมล็ด',
  'เมล็ดกาแฟ',
  'ซ่อมบำรุง',
  'คั่วกาแฟ',
  'คั่ว',
] as const;

function topicBlob(parts: Array<string | null | undefined>): string {
  return normalizeSuggestionTitle(parts.filter(Boolean).join(' '));
}

function mentionsBranchWithdraw(blob: string): boolean {
  const hasWithdraw = blob.includes('เบิก');
  const hasBranch2 = blob.includes('สาขา2') || blob.includes('สาขา');
  return hasWithdraw && hasBranch2;
}

function mentionsBranch2Day(blob: string): boolean {
  return blob.includes('สาขา2') || blob.includes('สาขา');
}

function mentionsInventoryReorder(blob: string): boolean {
  return blob.includes('สั่งซื้อ') || blob.includes('reorder');
}

function mentionsInventoryCount(blob: string): boolean {
  return blob.includes('ตรวจนับ') || blob.includes('count');
}

function mentionsInventoryAccuracy(blob: string): boolean {
  return (
    blob.includes('ความแม่นยำ') ||
    blob.includes('ความถูกต้อง') ||
    blob.includes('accuracy')
  );
}

function mentionsSchedule(blob: string): boolean {
  return blob.includes('ตาราง') || blob.includes('กะ') || blob.includes('schedule');
}

function mentionsBeanOrders(blob: string): boolean {
  return blob.includes('เมล็ด') || blob.includes('bean');
}

function mentionsMaintenance(blob: string): boolean {
  return blob.includes('ซ่อม') || blob.includes('maintenance');
}

function addTopic(topics: Set<SuggestionTopic>, topic: SuggestionTopic) {
  topics.add(topic);
}

export function collectTaskTopics(task: SecretaryTask): Set<SuggestionTopic> {
  const topics = new Set<SuggestionTopic>();
  const blob = topicBlob([task.title, task.description]);

  if (task.task_type === 'branch_withdraw') {
    addTopic(topics, 'branch_withdraw');
  }
  if (task.task_type === 'roast_carry') {
    addTopic(topics, 'branch2_day');
  }
  if (task.task_type === 'inventory_reorder') {
    addTopic(topics, 'inventory_reorder');
  }
  if (task.task_type === 'inventory_count_due') {
    addTopic(topics, 'inventory_count');
  }
  if (task.task_type === 'inventory_accuracy_review') {
    addTopic(topics, 'inventory_accuracy');
  }
  if (
    task.task_type === 'schedule_understaffed' ||
    task.task_type === 'schedule_leave_risk' ||
    task.task_type === 'schedule_mgmt_review'
  ) {
    addTopic(topics, 'schedule');
  }
  if (task.task_type.startsWith('bean_')) {
    addTopic(topics, 'bean_orders');
  }
  if (task.task_type.startsWith('maintenance_')) {
    addTopic(topics, 'maintenance');
  }

  if (mentionsBranchWithdraw(blob)) addTopic(topics, 'branch_withdraw');
  if (mentionsBranch2Day(blob) && blob.includes('คั่ว')) addTopic(topics, 'branch2_day');
  if (mentionsInventoryReorder(blob)) addTopic(topics, 'inventory_reorder');
  if (mentionsInventoryCount(blob)) addTopic(topics, 'inventory_count');
  if (mentionsInventoryAccuracy(blob) && !mentionsBranchWithdraw(blob)) {
    addTopic(topics, 'inventory_accuracy');
  }
  if (mentionsSchedule(blob)) addTopic(topics, 'schedule');
  if (mentionsBeanOrders(blob)) addTopic(topics, 'bean_orders');
  if (mentionsMaintenance(blob)) addTopic(topics, 'maintenance');

  return topics;
}

export function collectSuggestionTopics(suggestion: AiSuggestionRawItem): Set<SuggestionTopic> {
  const topics = new Set<SuggestionTopic>();
  const blob = topicBlob([suggestion.title, suggestion.description, suggestion.rationale]);

  if (suggestion.module === 'inventory_count') addTopic(topics, 'inventory_count');
  if (suggestion.module === 'inventory_accuracy' && !mentionsBranchWithdraw(blob)) {
    addTopic(topics, 'inventory_accuracy');
  }
  if (suggestion.module === 'bean_orders') addTopic(topics, 'bean_orders');
  if (suggestion.module === 'maintenance') addTopic(topics, 'maintenance');

  if (mentionsBranchWithdraw(blob)) addTopic(topics, 'branch_withdraw');
  if (mentionsBranch2Day(blob) && blob.includes('คั่ว')) addTopic(topics, 'branch2_day');
  if (mentionsInventoryReorder(blob)) addTopic(topics, 'inventory_reorder');
  if (mentionsInventoryCount(blob)) addTopic(topics, 'inventory_count');
  if (mentionsInventoryAccuracy(blob) && !mentionsBranchWithdraw(blob)) {
    addTopic(topics, 'inventory_accuracy');
  }
  if (mentionsSchedule(blob)) addTopic(topics, 'schedule');
  if (mentionsBeanOrders(blob)) addTopic(topics, 'bean_orders');
  if (mentionsMaintenance(blob)) addTopic(topics, 'maintenance');

  return topics;
}

export function sharedCorePhrase(left: string, right: string): boolean {
  const normalizedLeft = normalizeSuggestionTitle(left);
  const normalizedRight = normalizeSuggestionTitle(right);

  for (const phrase of CORE_PHRASES) {
    const normalizedPhrase = normalizeSuggestionTitle(phrase);
    if (
      normalizedPhrase.length >= 4 &&
      normalizedLeft.includes(normalizedPhrase) &&
      normalizedRight.includes(normalizedPhrase)
    ) {
      return true;
    }
  }

  return false;
}

export function hasSuggestionTopicOverlap(
  suggestion: AiSuggestionRawItem,
  task: SecretaryTask,
): boolean {
  const suggestionTopics = collectSuggestionTopics(suggestion);
  const taskTopics = collectTaskTopics(task);

  for (const topic of suggestionTopics) {
    if (taskTopics.has(topic)) {
      return true;
    }
  }

  return false;
}
