'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ThaiPostalAddressValue } from '@/lib/bean-orders/address';
import {
  lookupThaiPostalAreas,
  normalizeThaiPostalCode,
  type ThaiPostalAreaOption,
} from '@/lib/bean-orders/thai-postal-lookup';
import {
  findProfileByFieldValue,
  profilesMatchingName,
  uniqueFieldValues,
} from '@/lib/bean-orders/form-suggestions';
import { cn } from '@/lib/utils';
import { AutocompleteTextField } from './AutocompleteTextField';
import { BeanOrderSelect } from './BeanOrderSelect';
import { AddressProfilePicker } from './AddressProfilePicker';
import { BEAN_ORDER_CARD } from './bean-order-layout';

export type { ThaiPostalAddressValue };

type AddressField = 'name' | 'phone' | 'postalCode' | 'addressLine';

type Props = {
  title: string;
  value: ThaiPostalAddressValue;
  onChange: (value: ThaiPostalAddressValue) => void;
  profiles: ThaiPostalAddressValue[];
  inputClass: string;
  nameRequired?: boolean;
  addressRequired?: boolean;
  embedded?: boolean;
  /** When true, omit the name field (caller owns customer name elsewhere). */
  hideNameField?: boolean;
};

export function ThaiPostalAddressSection({
  title,
  value,
  onChange,
  profiles,
  inputClass,
  nameRequired = false,
  addressRequired = false,
  embedded = false,
  hideNameField = false,
}: Props) {
  const [postalHint, setPostalHint] = useState<string | null>(null);
  const [profilePicker, setProfilePicker] = useState<ThaiPostalAddressValue[] | null>(null);
  const areaOptions = useMemo(
    () => lookupThaiPostalAreas(value.postalCode),
    [value.postalCode],
  );

  useEffect(() => {
    const normalized = normalizeThaiPostalCode(value.postalCode);
    if (normalized.length < 5) {
      setPostalHint(null);
      return;
    }
    if (areaOptions.length === 0) {
      setPostalHint('ไม่พบรหัสไปรษณีย์นี้');
      return;
    }
    setPostalHint(null);
  }, [areaOptions.length, value.postalCode]);

  function patch(partial: Partial<ThaiPostalAddressValue>) {
    onChange({ ...value, ...partial });
  }

  function applyProfile(profile: ThaiPostalAddressValue) {
    onChange(profile);
    setProfilePicker(null);
  }

  function selectArea(option: ThaiPostalAreaOption) {
    patch({
      areaId: option.id,
      subdistrict: option.subdistrict,
      district: option.district,
      province: option.province,
      postalCode: option.postalCode,
    });
  }

  function handlePostalCodeChange(raw: string) {
    const postalCode = normalizeThaiPostalCode(raw);
    const options = lookupThaiPostalAreas(postalCode);

    if (options.length === 1) {
      const option = options[0]!;
      patch({
        postalCode: option.postalCode,
        areaId: option.id,
        subdistrict: option.subdistrict,
        district: option.district,
        province: option.province,
      });
      return;
    }

    patch({
      postalCode,
      areaId: '',
      subdistrict: '',
      district: '',
      province: '',
    });
  }

  function handleFieldSelect(field: AddressField, selected: string) {
    if (field === 'postalCode') {
      handlePostalCodeChange(selected);
      return;
    }

    patch({ [field]: selected } as Partial<ThaiPostalAddressValue>);

    if (field === 'name') {
      const matches = profilesMatchingName(profiles, selected);
      if (matches.length === 1) {
        applyProfile({ ...matches[0]!, name: selected });
      } else if (matches.length > 1) {
        setProfilePicker(matches.map((profile) => ({ ...profile, name: selected })));
      }
      return;
    }

    const matches = profiles.filter((profile) => profile[field].trim() === selected.trim());
    if (matches.length === 1) {
      applyProfile(matches[0]!);
    } else if (matches.length > 1) {
      setProfilePicker(matches);
    } else {
      const profile = findProfileByFieldValue(profiles, field, selected);
      if (profile) applyProfile(profile);
    }
  }

  const showAreaPicker = normalizeThaiPostalCode(value.postalCode).length === 5 && areaOptions.length > 0;

  const fields = (
    <>
      {title ? <h2 className="text-sm font-normal text-muted-foreground">{title}</h2> : null}

      {!hideNameField && (
        <AutocompleteTextField
          value={value.name}
          onChange={(name) => patch({ name })}
          onSelect={(name) => handleFieldSelect('name', name)}
          suggestions={uniqueFieldValues(profiles, 'name', value.name)}
          inputClass={inputClass}
          placeholder="ชื่อ"
          required={nameRequired}
          autoComplete="name"
        />
      )}

      <AutocompleteTextField
        value={value.phone}
        onChange={(phone) => patch({ phone })}
        onSelect={(phone) => handleFieldSelect('phone', phone)}
        suggestions={uniqueFieldValues(profiles, 'phone', value.phone)}
        inputClass={inputClass}
        placeholder="เบอร์โทร"
        inputMode="tel"
        autoComplete="tel"
      />

      <AutocompleteTextField
        value={value.postalCode}
        onChange={handlePostalCodeChange}
        onSelect={(postalCode) => handleFieldSelect('postalCode', postalCode)}
        suggestions={uniqueFieldValues(profiles, 'postalCode', value.postalCode)}
        inputClass={inputClass}
        placeholder="รหัสไปรษณีย์ 5 หลัก"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={5}
      />

      {postalHint && <p className="text-sm text-red-600">{postalHint}</p>}

      {showAreaPicker && (
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">เลือกพื้นที่ (ตำบล/แขวง)</label>
          <BeanOrderSelect
            value={value.areaId}
            onChange={(e) => {
              const option = areaOptions.find((item) => item.id === e.target.value);
              if (option) selectArea(option);
            }}
            required={addressRequired}
          >
            <option value="">เลือกพื้นที่</option>
            {areaOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </BeanOrderSelect>
        </div>
      )}

      <AutocompleteTextField
        value={value.addressLine}
        onChange={(addressLine) => patch({ addressLine })}
        onSelect={(addressLine) => handleFieldSelect('addressLine', addressLine)}
        suggestions={uniqueFieldValues(profiles, 'addressLine', value.addressLine)}
        inputClass={inputClass}
        placeholder="บ้านเลขที่ ซอย ถนน"
        required={addressRequired}
        autoComplete="street-address"
        multiline
      />

      {profilePicker && profilePicker.length > 0 && (
        <AddressProfilePicker
          title="เลือกที่อยู่ที่ตรงกับชื่อนี้"
          profiles={profilePicker}
          onSelect={applyProfile}
        />
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{fields}</div>;
  }

  return (
    <section className={`${BEAN_ORDER_CARD} mb-5 space-y-3 p-4`}>
      {fields}
    </section>
  );
}
