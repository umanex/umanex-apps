import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = { children: ReactNode; className?: string };

/** Rol-tag (Over ons), bruine accent-rand. */
export const Pill = ({ children, className }: Props) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border border-accent/40 px-3 py-1 text-xs text-ink',
      className,
    )}
  >
    {children}
  </span>
);
