export function normalizeGuidanceText(text: string, maxLength = 280): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function isUsableGuidanceText(text: string, actionableTaskCount: number): boolean {
  const normalized = normalizeGuidanceText(text);
  if (!normalized) return false;
  if (actionableTaskCount === 0) return true;
  if (normalized.length < 20) return false;
  return true;
}

export function resolveGuidanceText(
  candidate: string,
  fallback: string,
  actionableTaskCount: number,
): string {
  const normalized = normalizeGuidanceText(candidate);
  if (isUsableGuidanceText(normalized, actionableTaskCount)) {
    return normalized;
  }
  return fallback;
}
