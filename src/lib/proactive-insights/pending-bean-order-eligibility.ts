import {
  shouldIncludeIncompleteBeanOrder,
  type BeanOrderWorkflowStatusInput,
} from '@/lib/bean-orders/workflow-status';

export type BeanOrderInsightStatus = BeanOrderWorkflowStatusInput & {
  paymentStatus: string;
  fulfillmentStatus: string;
};

export {
  isBeanOrderPaymentComplete,
  isBeanOrderDeliveryComplete,
  shouldIncludeIncompleteBeanOrder,
} from '@/lib/bean-orders/workflow-status';

export { isBeanOrderPaymentSettled } from '@/lib/bean-orders/order-status';

/** @deprecated Use shouldIncludeIncompleteBeanOrder */
export function shouldIncludeBeanOrderInPendingInsights(order: BeanOrderInsightStatus): boolean {
  return shouldIncludeIncompleteBeanOrder(order);
}
