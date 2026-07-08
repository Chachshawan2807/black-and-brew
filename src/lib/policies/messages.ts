export {
  READ_ONLY_DENY_MSG,
  FORCE_LOGOUT_DENY_MSG,
} from '@/lib/auth-constants';

/** ADR SEC-AUTH-001 — shared unauthorized message for server gates. */
export const UNAUTHORIZED_MSG = 'Unauthorized: Session missing or invalid';
