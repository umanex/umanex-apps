import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = { children: ReactNode; className?: string };

/** Witte card, radius 8px, zachte schaduw. */
export const Card = ({ children, className }: Props) => (
  <div className={cn('rounded-lg bg-white p-8 shadow-card', className)}>{children}</div>
);
