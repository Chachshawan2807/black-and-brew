import { ensureServerSession } from '@/lib/security/server-auth';
import {
  evaluateAuthz,
  subjectFromPinSession,
  subjectFromServerAuth,
} from '@/lib/policies/authz';
import type { PolicyAction, PolicySubject } from '@/lib/policies/types';

function denyReason(action: PolicyAction, subject: PolicySubject): string | null {
  const decision = evaluateAuthz(subject, action);
  return decision.allow ? null : decision.reason;
}

/** Returns error message or null when read access is granted. */
export async function requireReadAccess(): Promise<string | null> {
  const auth = await ensureServerSession();
  if (!auth.ok) return auth.error;
  return denyReason('read', subjectFromServerAuth(auth));
}

/** Returns error message or null when mutation is allowed. */
export async function requireMutationAccess(): Promise<string | null> {
  const auth = await ensureServerSession();
  if (!auth.ok) return auth.error;
  return denyReason('mutate', subjectFromServerAuth(auth));
}

/** Returns session context or error when privileged access is allowed. */
export async function requirePrivilegedSession(): Promise<
  | { ok: true; userId?: string; readOnly: boolean }
  | { ok: false; error: string }
> {
  const auth = await ensureServerSession();
  if (!auth.ok) return { ok: false, error: auth.error };
  const error = denyReason('privileged', subjectFromServerAuth(auth));
  if (error) return { ok: false, error };
  return { ok: true, userId: auth.userId, readOnly: auth.readOnly };
}

/** Mutation gate for actions that return `{ success, error }`. */
export async function gateMutation(): Promise<
  { success: true } | { success: false; error: string }
> {
  const error = await requireMutationAccess();
  if (error) return { success: false, error };
  return { success: true };
}

/** PIN-only page gate — matches legacy checkAuth (PinGateway session). */
export function requirePinReadAccess(session: {
  verified: boolean;
  readOnly: boolean;
}): boolean {
  return evaluateAuthz(subjectFromPinSession(session), 'read').allow;
}

/** Writable check from PIN cookies only (legacy assertWritableSession). */
export function requirePinMutationAccess(readOnly: boolean): string | null {
  return denyReason('mutate', { verified: true, readOnly });
}
