import type { ServerAuthResult } from '@/lib/security/server-auth';
import { READ_ONLY_DENY_MSG, UNAUTHORIZED_MSG } from '@/lib/policies/messages';
import type { AuthzDecision, PolicyAction, PolicySubject } from '@/lib/policies/types';

export function subjectFromServerAuth(
  auth: Extract<ServerAuthResult, { ok: true }>
): PolicySubject {
  return {
    verified: true,
    readOnly: auth.readOnly,
    userId: auth.userId,
  };
}

export function subjectFromPinSession(session: {
  verified: boolean;
  readOnly: boolean;
}): PolicySubject {
  return {
    verified: session.verified,
    readOnly: session.readOnly,
  };
}

/**
 * Central authorization evaluator (Policy-as-Code).
 * PIN + read-only: read allowed, mutate/privileged denied.
 */
export function evaluateAuthz(
  subject: PolicySubject,
  action: PolicyAction
): AuthzDecision {
  if (!subject.verified) {
    return { allow: false, reason: UNAUTHORIZED_MSG };
  }

  if (action === 'read') {
    return { allow: true };
  }

  if (subject.readOnly) {
    return { allow: false, reason: READ_ONLY_DENY_MSG };
  }

  return { allow: true };
}

export function canRead(subject: PolicySubject): boolean {
  return evaluateAuthz(subject, 'read').allow;
}

export function canMutate(subject: PolicySubject): boolean {
  return evaluateAuthz(subject, 'mutate').allow;
}

export function canAccessPrivileged(subject: PolicySubject): boolean {
  return evaluateAuthz(subject, 'privileged').allow;
}
