import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import {
  emptyThaiPostalAddress,
  type ThaiPostalAddressValue,
} from '@/lib/bean-orders/address';
import { lookupThaiPostalAreas } from '@/lib/bean-orders/thai-postal-lookup';
import { ThaiPostalAddressSection } from '@/app/[locale]/bean-orders/_components/ThaiPostalAddressSection';

function AddressHarness() {
  const [value, setValue] = useState<ThaiPostalAddressValue>(emptyThaiPostalAddress());

  return (
    <ThaiPostalAddressSection
      title="ที่อยู่"
      value={value}
      onChange={setValue}
      profiles={[]}
      inputClass="address-input"
    />
  );
}

describe('ThaiPostalAddressSection', () => {
  test('shows the province name after selecting an area by postal code', () => {
    const option = lookupThaiPostalAreas('12120')[0];
    expect(option).toBeDefined();

    render(<AddressHarness />);
    fireEvent.change(screen.getByPlaceholderText('รหัสไปรษณีย์ 5 หลัก'), {
      target: { value: '12120' },
    });
    fireEvent.click(screen.getByRole('option', {
      name: `12120 · ${option!.subdistrict} / ${option!.district} / ${option!.province}`,
    }));

    expect(screen.getByLabelText('ตำบล อำเภอ และจังหวัด'))
      .toHaveValue(`ต. ${option!.subdistrict} อ. ${option!.district} จ. ${option!.province}`);
  });
});
