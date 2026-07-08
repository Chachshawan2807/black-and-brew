/** Policy subject — who is asking (PIN or Supabase session). */
export type PolicySubject = {
  verified: boolean;
  readOnly: boolean;
  userId?: string;
};

/** Authorization actions for BLACKANDBREW ERP. */
export type PolicyAction =
  | 'read'        // view data (read-only PIN allowed)
  | 'mutate'      // create/update/delete via Server Actions
  | 'privileged'; // service-role bypass paths (e.g. AI chat)

export type AuthzDecision =
  | { allow: true }
  | { allow: false; reason: string };
