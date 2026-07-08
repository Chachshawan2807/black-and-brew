import { READ_ONLY_DENY_MSG } from '@/lib/policies/messages';

/** Client-side mutation guard — mirrors server mutate policy for UI affordances. */
export function canClientMutate(isReadOnly: boolean): boolean {
  return !isReadOnly;
}

export function getMutationDenyMessage(): string {
  return READ_ONLY_DENY_MSG;
}
