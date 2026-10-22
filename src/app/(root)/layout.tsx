import type { ReactNode } from 'react';

export default function RootRedirectLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
