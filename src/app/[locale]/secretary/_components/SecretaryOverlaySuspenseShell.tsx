'use client';

import SecretaryTaskSubwindow from './SecretaryTaskSubwindow';
import {
  SecretaryOverlayLoadingSkeleton,
  type SecretaryOverlaySkeletonVariant,
} from './SecretaryOverlayLoadingSkeleton';

type SecretaryOverlaySuspenseShellProps = {
  title: string;
  onClose: () => void;
  maxWidthClass?: string;
  variant?: SecretaryOverlaySkeletonVariant;
  label?: string;
};

/** Suspense fallback while secretary overlay chunks load. */
export function SecretaryOverlaySuspenseShell({
  title,
  onClose,
  maxWidthClass,
  variant = 'embed',
  label,
}: SecretaryOverlaySuspenseShellProps) {
  return (
    <SecretaryTaskSubwindow title={title} onClose={onClose} maxWidthClass={maxWidthClass}>
      <SecretaryOverlayLoadingSkeleton variant={variant} label={label} />
    </SecretaryTaskSubwindow>
  );
}
