import { evaluateInsightRules } from '@/lib/proactive-insights/rules';
import type { Insight, InsightRuleId } from '@/lib/proactive-insights/types';
import {
  formatSecretaryBeanInventoryBridgeDescription,
  resolveSecretaryBeanInventoryBridgeSourceRef,
} from '@/lib/secretary/format-bean-inventory-bridge-description';
import { buildSourceRefHash } from '@/lib/secretary/source-ref-hash';
import type { DerivedTaskDraft, SecretarySnapshot } from '@/lib/secretary/types';

const COVERED_BY_SCHEDULE_RULES: InsightRuleId[] = [
  'understaffed_low_stock',
  'leave_coverage_risk',
];

function insightAlreadyCovered(insight: Insight, snapshot: SecretarySnapshot): boolean {
  if (COVERED_BY_SCHEDULE_RULES.includes(insight.ruleId)) {
    return true;
  }

  if (insight.ruleId === 'bean_orders_inventory_gap') {
    return snapshot.operational.pendingBeanOrders.length === 0;
  }

  return false;
}

export function deriveInsightBridgeTasks(snapshot: SecretarySnapshot): DerivedTaskDraft[] {
  const insights = evaluateInsightRules(snapshot.operational);
  if (insights.length === 0) return [];

  const tasks: DerivedTaskDraft[] = [];
  const localePrefix = `/${snapshot.locale}`;

  const beanInventoryGap = insights.find(
    (insight) => insight.ruleId === 'bean_orders_inventory_gap',
  );
  if (
    beanInventoryGap &&
    !insightAlreadyCovered(beanInventoryGap, snapshot) &&
    snapshot.itemsToOrder.length > 0
  ) {
    const description = formatSecretaryBeanInventoryBridgeDescription(snapshot);
    if (description) {
      const sourceRef = resolveSecretaryBeanInventoryBridgeSourceRef(snapshot);
      tasks.push({
        taskType: 'custom',
        title: 'ตรวจ bean orders และสต็อกคลังที่เกี่ยวข้อง',
        description,
        priority: 'urgent',
        module: 'bean_orders',
        sourceRef,
        sourceRefHash: buildSourceRefHash('insight_bridge_bean_inventory', sourceRef),
        actionHref: `${localePrefix}/bean-orders`,
        estimatedMinutes: 25,
        metadata: { insightBridge: true, insightRuleId: beanInventoryGap.ruleId },
      });
    }
  }

  const actionableInsights = insights.filter(
    (insight) => insight.ruleId !== 'daily_digest' && !insightAlreadyCovered(insight, snapshot),
  );
  if (actionableInsights.length >= 2) {
    const sourceRef = {
      rule: 'insight_bridge',
      insightRuleIds: actionableInsights.map((insight) => insight.ruleId),
    };
    const summary = actionableInsights
      .map((insight) => `${insight.title}: ${insight.summary}`)
      .join(' · ');
    tasks.push({
      taskType: 'schedule_mgmt_review',
      title: 'ตรวจสอบการแจ้งเตือนเชิงรุก',
      description: summary,
      priority: actionableInsights.some((insight) => insight.priority === 'high')
        ? 'urgent'
        : 'normal',
      module: 'dashboard',
      sourceRef,
      sourceRefHash: buildSourceRefHash('insight_bridge_digest', sourceRef),
      actionHref: `${localePrefix}/dashboard`,
      estimatedMinutes: 15,
      metadata: { insightBridge: true, insightCount: actionableInsights.length },
    });
  }

  return tasks;
}
