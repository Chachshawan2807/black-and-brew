import type { BeanOrderTrackingEvent } from '@/lib/bean-orders/tracking-events';
import {
  formatTrackingEventDateTime,
  formatTrackingLocationParts,
} from '@/lib/bean-orders/tracking-events';
import { formatShipmentTrackingLabel } from '@/lib/bean-orders/trackingmore';

type Props = {
  trackingNumber?: string | null;
  trackingStatus?: string | null;
  fulfillmentStatus?: 'pending' | 'shipped';
  events: BeanOrderTrackingEvent[];
  compact?: boolean;
};

function LocationDetail({ event }: { event: BeanOrderTrackingEvent }) {
  const locationLabel = formatTrackingLocationParts(event);
  if (!locationLabel || locationLabel === '—') return null;

  return (
    <p className="text-xs text-muted-foreground mt-0.5">
      {locationLabel}
    </p>
  );
}

export function TrackingTimeline({
  trackingNumber,
  trackingStatus,
  fulfillmentStatus = 'shipped',
  events,
  compact = false,
}: Props) {
  const statusLabel = formatShipmentTrackingLabel(trackingStatus, {
    fulfillmentStatus,
    trackingNumber,
  });

  if (events.length === 0) {
    return (
      <div className={compact ? 'mt-2 text-xs text-muted-foreground' : 'space-y-1 text-sm'}>
        {trackingNumber ? (
          <p>
            พัสดุ <span className="text-foreground">{trackingNumber}</span>
            {statusLabel ? <span> / {statusLabel}</span> : null}
          </p>
        ) : null}
        <p className="text-muted-foreground">ยังไม่มีรายละเอียดสถานะจากขนส่ง</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'mt-2 space-y-2' : 'space-y-3'}>
      {trackingNumber ? (
        <p className={compact ? 'text-xs text-muted-foreground' : 'text-sm'}>
          พัสดุ <span className="text-foreground">{trackingNumber}</span>
          {statusLabel ? <span> / {statusLabel}</span> : null}
        </p>
      ) : null}
      <ul className={compact ? 'space-y-2' : 'space-y-3'}>
        {events.map((event) => {
          const { date, time } = formatTrackingEventDateTime(event.at);
          return (
            <li
              key={`${event.at}-${event.status}-${event.detail}`}
              className={compact ? 'rounded-xl border border-border/70 bg-muted/20 px-3 py-2' : 'rounded-xl border border-border px-3 py-3'}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className={compact ? 'text-xs font-normal text-foreground' : 'text-sm text-foreground'}>
                  {event.statusLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {date}
                  {time ? ` / ${time}` : ''}
                </span>
              </div>
              <p className={compact ? 'text-xs text-muted-foreground mt-0.5' : 'text-sm text-muted-foreground mt-1'}>
                {event.detail}
              </p>
              <LocationDetail event={event} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
