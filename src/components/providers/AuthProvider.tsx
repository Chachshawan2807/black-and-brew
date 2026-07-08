'use client';

import { createContext, useContext } from 'react';
import { AuthSessionGuard } from '@/components/auth/AuthSessionGuard';
import { canClientMutate, getMutationDenyMessage } from '@/lib/policies/client';

export const READ_ONLY_DENY_MSG = getMutationDenyMessage();

const AuthContext = createContext<boolean>(false);

export function AuthProvider({
  isReadOnly,
  children,
}: {
  isReadOnly: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={isReadOnly}>
      <AuthSessionGuard />
      {children}
    </AuthContext.Provider>
  );
}

export function useReadOnly(): boolean {
  return useContext(AuthContext);
}

export function useCanMutate(): boolean {
  return canClientMutate(useReadOnly());
}
