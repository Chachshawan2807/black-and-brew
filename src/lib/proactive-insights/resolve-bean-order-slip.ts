export function resolveBeanOrderSlipUploadedAt(
  payments:
    | { uploaded_at?: string | null; slip_url?: string | null }
    | { uploaded_at?: string | null; slip_url?: string | null }[]
    | null
    | undefined,
): string | null {
  const row = Array.isArray(payments) ? payments[0] : payments;
  if (!row) return null;
  if (typeof row.uploaded_at === 'string' && row.uploaded_at) return row.uploaded_at;
  if (typeof row.slip_url === 'string' && row.slip_url) return row.slip_url;
  return null;
}
