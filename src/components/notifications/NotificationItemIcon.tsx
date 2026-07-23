'use client';

import {
  CalendarRange,
  Layers,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InventoryNotification } from '@/lib/notification-types';
import { resolveNotificationDisplayIcon } from '@/lib/notification-display-icon';

type NotificationItemIconProps = {
  item: InventoryNotification;
  size?: number;
  strokeWidth?: number;
  className?: string;
  highPriorityFallbackClass?: string;
};

export function NotificationItemIcon({
  item,
  size = 14,
  strokeWidth = 1.75,
  className,
  highPriorityFallbackClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}: NotificationItemIconProps) {
  const { kind, containerClass } = resolveNotificationDisplayIcon(item);
  const isPastelKind =
    kind === 'schedule' ||
    kind === 'bean-delivered' ||
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
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
        useHighPriority ? highPriorityFallbackClass : containerClass,
        className,
      )}
    >
      {kind === 'schedule' && <CalendarRange {...iconProps} />}
      {kind === 'bean-delivered' && <Truck {...iconProps} />}
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
