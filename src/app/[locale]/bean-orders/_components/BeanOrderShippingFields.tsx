'use client';

import { ChevronDown } from 'lucide-react';
import {
  BEAN_ORDER_CARRIERS,
  OTHER_CARRIER_CODE,
} from '@/lib/bean-orders/carriers';
import { BeanOrderSelect } from './BeanOrderSelect';
import { cn } from '@/lib/utils';

type Props = {
  carrierCode: string;
  customCarrierLabel: string;
  trackingNumber: string;
  onCarrierCodeChange: (code: string) => void;
  onCustomCarrierLabelChange: (label: string) => void;
  onTrackingNumberChange: (tracking: string) => void;
  inputClass: string;
  disabled?: boolean;
};

export function BeanOrderShippingFields({
  carrierCode,
  customCarrierLabel,
  trackingNumber,
  onCarrierCodeChange,
  onCustomCarrierLabelChange,
  onTrackingNumberChange,
  inputClass,
  disabled = false,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {carrierCode === OTHER_CARRIER_CODE ? (
        <div className="relative w-full">
          <input
            className={cn(inputClass, 'w-full pr-10')}
            value={customCarrierLabel}
            onChange={(e) => onCustomCarrierLabelChange(e.target.value)}
            placeholder="อื่นๆ"
            disabled={disabled}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
            aria-label="เลือกช่องทางจัดส่ง"
            disabled={disabled}
            onClick={() => {
              onCarrierCodeChange('kerryexpress-th');
              onCustomCarrierLabelChange('');
            }}
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <BeanOrderSelect
          wrapperClassName="w-full"
          value={carrierCode}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            onCarrierCodeChange(next);
            if (next === OTHER_CARRIER_CODE) {
              onCustomCarrierLabelChange('');
            }
          }}
        >
          {BEAN_ORDER_CARRIERS.map((carrier) => (
            <option key={carrier.code} value={carrier.code}>
              {carrier.label}
            </option>
          ))}
        </BeanOrderSelect>
      )}
      <input
        className={cn(inputClass, 'w-full')}
        value={trackingNumber}
        onChange={(e) => onTrackingNumberChange(e.target.value)}
        placeholder="เลขพัสดุ"
        disabled={disabled}
      />
    </div>
  );
}
