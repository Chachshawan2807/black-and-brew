'use client';

import { createContext, useContext } from 'react';
import { READ_ONLY_DENY_MSG } from '@/lib/auth-constants';

export { READ_ONLY_DENY_MSG };

const AuthContext = createContext<boolean>(false);

export function AuthProvider({
  isReadOnly,
  children,
}: {
  isReadOnly: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={isReadOnly}>{children}</AuthContext.Provider>
  );
}

export function useReadOnly(): boolean {
  return useContext(AuthContext);
}
