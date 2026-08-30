export type Branch2ShiftLike = {
  metadata?: {
    location?: string;
    remark?: string;
    is_management?: boolean;
  } | null;
};

export type SecretaryStaffDutyEntry = {
  name: string;
  shiftText: string;
  remark?: string;
};

const BRANCH2_LOCATION = 'ไปสาขา 2';

export function isBranch2Shift(shift: Branch2ShiftLike): boolean {
  const location = shift.metadata?.location?.trim();
  return location === BRANCH2_LOCATION;
}

export function detectBranch2Day(shifts: Branch2ShiftLike[]): {
  isBranch2Day: boolean;
  branch2Remark?: string;
} {
  const branchShift = shifts.find((shift) => isBranch2Shift(shift));
  if (!branchShift) {
    return { isBranch2Day: false };
  }

  const remark = branchShift.metadata?.remark?.trim();
  return {
    isBranch2Day: true,
    branch2Remark: remark || undefined,
  };
}

/** วันไปสาขา 2 ตามกะของพนักงานที่เลขาติดตามเท่านั้น ไม่ใช่ทุกคนในตาราง */
export function resolveSecretaryBranch2Day(
  otherDutyStaff: SecretaryStaffDutyEntry[],
  focusStaffName: string,
): ReturnType<typeof detectBranch2Day> {
  const focusDuty = otherDutyStaff.filter((entry) => entry.name === focusStaffName);
  return detectBranch2Day(
    focusDuty.map((entry) => ({
      metadata: { location: entry.shiftText, remark: entry.remark },
    })),
  );
}
