import { buildSourceRefHash } from '@/lib/secretary/source-ref-hash';
import type { DerivedTaskDraft, SecretarySnapshot } from '@/lib/secretary/types';

export function deriveBranch2Tasks(snapshot: SecretarySnapshot): DerivedTaskDraft[] {
  if (!snapshot.isBranch2Day) return [];

  const sourceRef = {
    dateIso: snapshot.dateIso,
    remark: snapshot.branch2Remark ?? '',
  };

  const pendingBeans = snapshot.operational.pendingBeanOrders
    .slice(0, 3)
    .map((order) => order.customerName)
    .join(', ');

  const descriptionParts = [
    snapshot.branch2Remark ? `หมายเหตุกะ: ${snapshot.branch2Remark}` : null,
    pendingBeans ? `ออเดอร์ค้าง: ${pendingBeans}` : null,
  ].filter(Boolean);

  return [
    {
      taskType: 'roast_carry',
      title: 'คั่วกาแฟ — checklist วันไปสาขา 2',
      description: descriptionParts.join(' · ') || 'ตรวจ checklist คั่วตามออเดอร์/ความต้องการสาขา 1',
      priority: 'urgent',
      module: 'branch2',
      sourceRef,
      sourceRefHash: buildSourceRefHash('roast_carry', sourceRef),
      estimatedMinutes: 120,
      metadata: {
        isBranch2Overlay: true,
        beanOrderHint: pendingBeans || null,
      },
    },
  ];
}
