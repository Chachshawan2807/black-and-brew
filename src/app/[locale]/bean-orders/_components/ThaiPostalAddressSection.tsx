'use client';

import { useMemo, useState } from 'react';
import type { ThaiPostalAddressValue } from '@/lib/bean-orders/address';
import { formatThaiPhoneNumber, normalizeThaiPhoneNumber } from '@/lib/bean-orders/thai-phone';
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
import { AutocompleteTextField } from './AutocompleteTextField';
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
  const [profilePicker, setProfilePicker] = useState<ThaiPostalAddressValue[] | null>(null);
  const areaOptions = useMemo(
    () => lookupThaiPostalAreas(value.postalCode),
    [value.postalCode],
  );
  const phoneSuggestions = useMemo(
    () => uniqueFieldValues(
      profiles.map((profile) => ({
        ...profile,
        phone: normalizeThaiPhoneNumber(profile.phone),
      })),
      'phone',
      value.phone,
    ).map(formatThaiPhoneNumber),
    [profiles, value.phone],
  );
  const postalHint = useMemo(() => {
    const normalized = normalizeThaiPostalCode(value.postalCode);
    if (normalized.length < 5) return null;
    if (areaOptions.length === 0) return 'ไม่พบรหัสไปรษณีย์นี้';
    return null;
  }, [areaOptions.length, value.postalCode]);
  const isBangkokArea = ['กรุงเทพมหานคร', 'กรุงเทพฯ', 'Bangkok'].includes(value.province);

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

    if (field === 'phone') {
      const phone = normalizeThaiPhoneNumber(selected);
      patch({ phone });

      const matches = profiles.filter(
        (profile) => normalizeThaiPhoneNumber(profile.phone) === phone,
      );
      if (matches.length === 1) {
        applyProfile(matches[0]!);
      } else if (matches.length > 1) {
        setProfilePicker(matches);
      }
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

  const showAreaPicker =
    normalizeThaiPostalCode(value.postalCode).length > 0 && areaOptions.length > 0 && !value.areaId;

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
        value={formatThaiPhoneNumber(value.phone)}
        onChange={(phone) => patch({ phone: normalizeThaiPhoneNumber(phone) })}
        onSelect={(phone) => handleFieldSelect('phone', phone)}
        suggestions={phoneSuggestions}
        inputClass={inputClass}
        placeholder="เบอร์โทร"
        inputMode="tel"
        autoComplete="tel"
      />

      <div className="relative z-20">
        <AutocompleteTextField
          value={value.postalCode}
          onChange={handlePostalCodeChange}
          suggestions={[]}
          inputClass={inputClass}
          placeholder="รหัสไปรษณีย์ 5 หลัก"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
        />
        {showAreaPicker && (
          <ul
            className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-sm"
            role="listbox"
            aria-label="ตัวเลือกพื้นที่ตามรหัสไปรษณีย์"
          >
            {areaOptions.slice(0, 12).map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="min-h-11 w-full px-4 text-left text-sm text-foreground hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                  onClick={() => selectArea(option)}
                >
                  {option.postalCode} · {option.subdistrict} / {option.district} / {option.province}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(value.subdistrict || value.district || value.province) && (
        <input
          className={inputClass}
          value={[
            value.subdistrict && `${isBangkokArea ? 'แขวง' : 'ต.'} ${value.subdistrict}`,
            value.district && `${isBangkokArea ? 'เขต' : 'อ.'} ${value.district}`,
            value.province && (isBangkokArea ? 'กทม.' : `จ. ${value.province}`),
          ].filter(Boolean).join(' ')}
          aria-label="ตำบล อำเภอ และจังหวัด"
          readOnly
        />
      )}

      {postalHint && <p className="text-sm text-red-600">{postalHint}</p>}

      <AutocompleteTextField
        value={value.addressLine}
        onChange={(addressLine) => patch({ addressLine })}
        onSelect={(addressLine) => handleFieldSelect('addressLine', addressLine)}
        suggestions={uniqueFieldValues(profiles, 'addressLine', value.addressLine)}
        inputClass={inputClass}
        placeholder="เลขที่ หมู่ หมู่บ้าน ซอย ถนน"
        required={addressRequired}
        autoComplete="street-address"
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
