import { parseRecommendedFrequency } from '@/lib/maintenance/parse-recommended-frequency';

export const TASK_TYPE_PRESETS = ['ซ่อมแซม', 'บำรุงรักษา', 'ติดตั้ง', 'เปลี่ยนอะไหล่', 'อื่นๆ'] as const;

export type TaskTypePreset = (typeof TASK_TYPE_PRESETS)[number];

export type ServiceRecordFormInput = {
  start_date: string;
  equipment: string;
  detected_problem: string;
  task_type: string;
  work_details: string;
  recommended_frequency: string;
};

const normalizeText = (value: string) => value.trim().replace(/\s+/g, '').toLowerCase();

export function isTaskTypePreset(value: string) {
  return TASK_TYPE_PRESETS.includes(value as TaskTypePreset);
}

export function getTaskTypeSelectValue(value: string) {
  return isTaskTypePreset(value) ? value : 'อื่นๆ';
}

export function getTaskTypeInputValue(value: string) {
  return isTaskTypePreset(value) ? '' : value;
}

export function resolveTaskType(selectValue: string, customValue: string) {
  if (selectValue !== 'อื่นๆ') return selectValue;
  const trimmed = customValue.trim();
  return trimmed || 'อื่นๆ';
}

export function formatFrequencyMonths(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const sanitized = trimmed.replace(/^0+(?=\d)/, '');
  const amount = Number(sanitized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return `ทุก ${amount} เดือน`;
}

export function parseFrequencyMonthsForDisplay(value: string) {
  const parsed = parseRecommendedFrequency(value);
  if (parsed?.unit === 'month') return String(parsed.amount);

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return trimmed.replace(/^0+(?=\d)/, '');
  return '';
}

export function buildServiceRecordPayload(
  form: ServiceRecordFormInput,
  completionDate: string,
) {
  const taskTypeSelect = getTaskTypeSelectValue(form.task_type);
  const taskTypeCustom = getTaskTypeInputValue(form.task_type);

  return {
    start_date: form.start_date,
    equipment: form.equipment.trim(),
    detected_problem: form.detected_problem.trim() === '' ? null : form.detected_problem.trim(),
    task_type: resolveTaskType(taskTypeSelect, taskTypeCustom),
    work_details: form.work_details.trim() === '' ? null : form.work_details.trim(),
    recommended_frequency: formatFrequencyMonths(form.recommended_frequency),
    completion_date: completionDate,
  };
}

export function getUniqueEquipmentSuggestions(equipmentNames: string[], query: string) {
  const normalizedQuery = normalizeText(query);
  const seen = new Set<string>();

  return equipmentNames.reduce<string[]>((results, equipment) => {
    const trimmed = equipment.trim();
    if (!trimmed) return results;

    const normalizedEquipment = normalizeText(trimmed);
    if (normalizedQuery && !normalizedEquipment.includes(normalizedQuery)) return results;
    if (seen.has(normalizedEquipment)) return results;

    seen.add(normalizedEquipment);
    results.push(trimmed);
    return results;
  }, []);
}
