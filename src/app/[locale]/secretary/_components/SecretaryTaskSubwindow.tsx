'use client';

import type { ReactNode } from 'react';
import SecretaryTaskPanelShell from './SecretaryTaskPanelShell';

type SecretaryTaskSubwindowProps = {
  title: string;
  subtitle?: string;
  ariaLabel?: string;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-width utility, e.g. max-w-3xl */
  maxWidthClass?: string;
  zIndex?: number;
};

/** Shared secretary task sub-window: delegates chrome to SecretaryTaskPanelShell. */
export default function SecretaryTaskSubwindow({
  title,
  subtitle,
  ariaLabel,
  onClose,
  children,
  maxWidthClass = 'max-w-3xl',
  zIndex = 220,
}: SecretaryTaskSubwindowProps) {
  return (
    <SecretaryTaskPanelShell
      title={title}
      subtitle={subtitle}
      ariaLabel={ariaLabel}
      onClose={onClose}
      maxWidthClass={maxWidthClass}
      zIndex={zIndex}
      bodyScroll={false}
    >
      {children}
    </SecretaryTaskPanelShell>
  );
}
