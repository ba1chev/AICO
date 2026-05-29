export const WorkloadTypes = ['training', 'inference', 'fine-tuning', 'other'] as const;
export type WorkloadType = (typeof WorkloadTypes)[number];

export function isWorkloadType(value: unknown): value is WorkloadType {
  return typeof value === 'string' && (WorkloadTypes as readonly string[]).includes(value);
}

export const WorkloadLabelBG: Record<WorkloadType, string> = {
  training: 'Обучение',
  inference: 'Инференс',
  'fine-tuning': 'Фино настройване',
  other: 'Друго',
};
