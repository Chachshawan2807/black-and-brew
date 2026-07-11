export const BRANCH_WITHDRAW_NOTE_PREFIX = '[branch2-withdraw:';

export type BranchWithdrawFormatLine = {
  name: string;
  qtyBranch1: number;
  qtyBranch2: number | null;
  branch2Unit: string | null;
};

export function formatBranchWithdrawHeaderDate(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const buddhistTwoDigitYear = (date.getFullYear() + 543) % 100;
  return `${day}/${month}/${buddhistTwoDigitYear}`;
}

function resolveLineQty(line: BranchWithdrawFormatLine): number {
  if (line.qtyBranch2 !== null && line.qtyBranch2 > 0) {
    return line.qtyBranch2;
  }
  return line.qtyBranch1;
}

function formatBodyLine(index: number, line: BranchWithdrawFormatLine): string {
  const qty = resolveLineQty(line);
  const unitSuffix =
    line.branch2Unit && line.branch2Unit.trim() !== ''
      ? ` (${line.branch2Unit.trim()})`
      : '';
  return `${index}. ${line.name} = ${qty}${unitSuffix}`;
}

export function formatBranchWithdrawLineMessage(
  lines: BranchWithdrawFormatLine[],
  date: Date = new Date(),
): string {
  const qualifying = lines.filter((line) => line.qtyBranch1 > 0);
  const header = `สาขา 1 เบิกของ ${formatBranchWithdrawHeaderDate(date)}`;
  const body = qualifying.map((line, i) => formatBodyLine(i + 1, line));
  return [header, '', ...body].join('\n');
}

export function buildBranchWithdrawNote(withdrawalId: string): string {
  return `${BRANCH_WITHDRAW_NOTE_PREFIX}${withdrawalId}]`;
}

export function parsePositiveQtyString(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export function filterBranchWithdrawSaveLines<
  T extends { itemId: string; name: string; qtyBranch1: string; qtyBranch2: string; branch2Unit: string },
>(rows: T[]): Array<{
  itemId: string;
  name: string;
  qtyBranch1: number;
  qtyBranch2: number | null;
  branch2Unit: string | null;
}> {
  const result: Array<{
    itemId: string;
    name: string;
    qtyBranch1: number;
    qtyBranch2: number | null;
    branch2Unit: string | null;
  }> = [];

  for (const row of rows) {
    const qtyBranch1 = parsePositiveQtyString(row.qtyBranch1);
    if (qtyBranch1 === null) continue;
    const qtyBranch2 = parsePositiveQtyString(row.qtyBranch2);
    const branch2Unit = row.branch2Unit.trim() || null;
    result.push({ itemId: row.itemId, name: row.name, qtyBranch1, qtyBranch2, branch2Unit });
  }

  return result;
}
