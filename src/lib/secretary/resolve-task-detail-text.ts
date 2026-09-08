import {
  formatSecretaryBeanInventoryBridgeDescription,
  isSecretaryBeanInventoryBridgeTask,
} from '@/lib/secretary/format-bean-inventory-bridge-description';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

/** Detail body for secretary task overlays (not card surface). */
export function resolveSecretaryTaskDetailText(
  task: SecretaryTask,
  snapshot?: Pick<SecretarySnapshot, 'operational' | 'itemsToOrder'>,
): string | null {
  if (snapshot && isSecretaryBeanInventoryBridgeTask(task)) {
    const liveDescription = formatSecretaryBeanInventoryBridgeDescription(snapshot);
    if (liveDescription) return liveDescription;
  }

  const description = task.description?.trim();
  if (description) return description;

  return null;
}
