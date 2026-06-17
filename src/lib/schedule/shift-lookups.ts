type ShiftLike = {
  employee_id?: string | null;
  profile_id?: string | null;
  start_time?: string | null;
};

type ShiftTypeLike = {
  value: string;
};

export type ShiftDateLookup<TShift extends ShiftLike> = Map<string, TShift>;
export type ShiftTypeLookup<TShiftType extends ShiftTypeLike> = Map<string, TShiftType>;

export function createShiftDateKey(profileId: string, date: string) {
  return `${profileId}:${date}`;
}

export function createShiftDateLookup<TShift extends ShiftLike>(shifts: TShift[]) {
  const lookup: ShiftDateLookup<TShift> = new Map();

  for (const shift of shifts) {
    const profileId = shift.employee_id || shift.profile_id;
    const date = shift.start_time?.split('T')[0];

    if (profileId && date) {
      lookup.set(createShiftDateKey(profileId, date), shift);
    }
  }

  return lookup;
}

export function getShiftForProfileDate<TShift extends ShiftLike>(
  lookup: ShiftDateLookup<TShift>,
  profileId: string,
  date: string
) {
  return lookup.get(createShiftDateKey(profileId, date));
}

export function createShiftTypeLookup<TShiftType extends ShiftTypeLike>(shiftTypes: TShiftType[]) {
  return new Map(shiftTypes.map((type) => [type.value, type])) as ShiftTypeLookup<TShiftType>;
}

export function getShiftTypeForLocation<TShiftType extends ShiftTypeLike>(
  lookup: ShiftTypeLookup<TShiftType>,
  location?: string | null
) {
  return location ? lookup.get(location) : undefined;
}
