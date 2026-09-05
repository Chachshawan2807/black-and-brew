'use client';

import {
  AlertTriangle,
  Banknote,
  CalendarRange,
  Coffee,
  ICON_SIZE,
  ICON_STROKE,
  Layers,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  Truck,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { InventoryNotification } from '@/lib/notification-types';
import { resolveNotificationDisplayIcon } from '@/lib/notification-display-icon';
import { BB_ICON_BADGE_OUTLINE } from '@/lib/ui-outlined-tokens';

type NotificationItemIconProps = {
  item: InventoryNotification;
  size?: number;
  strokeWidth?: number;
  className?: string;
  highPriorityFallbackClass?: string;
};

export function NotificationItemIcon({
  item,
  size = ICON_SIZE.sm,
  strokeWidth = ICON_STROKE,
  className,
  highPriorityFallbackClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}: NotificationItemIconProps) {
  const { kind, containerClass } = resolveNotificationDisplayIcon(item);
  const isPastelKind =
    kind === 'schedule' ||
    kind === 'insight' ||
    kind === 'security' ||
    kind === 'bean-created' ||
    kind === 'bean-delivered' ||
    kind === 'bean-paid' ||
    kind === 'stock-in' ||
    kind === 'stock-out' ||
    kind === 'stock-adjust';
  const useHighPriority = item.priority === 'high' && !isPastelKind;

  const iconProps = {
    size,
    strokeWidth,
    className: isPastelKind ? 'text-black' : undefined,
  };

  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
        useHighPriority ? highPriorityFallbackClass : containerClass,
        !useHighPriority && BB_ICON_BADGE_OUTLINE,
        className,
      )}
    >
      {kind === 'schedule' && <CalendarRange {...iconProps} />}
      {kind === 'insight' && <AlertTriangle {...iconProps} />}
      {kind === 'security' && <ShieldAlert {...iconProps} />}
      {kind === 'bean-created' && <Coffee {...iconProps} />}
      {kind === 'bean-delivered' && <Truck {...iconProps} />}
      {kind === 'bean-paid' && <Banknote {...iconProps} />}
      {kind === 'stock-in' && <PackagePlus {...iconProps} />}
      {kind === 'stock-out' && <PackageMinus {...iconProps} />}
      {kind === 'stock-adjust' && <SlidersHorizontal {...iconProps} />}
      {kind === 'create' && <Plus {...iconProps} />}
      {kind === 'delete' && <Trash2 {...iconProps} />}
      {kind === 'bulk-update' && <Layers {...iconProps} />}
      {kind === 'update' && <Pencil {...iconProps} />}
    </div>
  );
}
