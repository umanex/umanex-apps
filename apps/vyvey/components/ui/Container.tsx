import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = { children: ReactNode; className?: string };

/** Centreert content op max 1152px met responsieve zijgutters. */
export const Container = ({ children, className }: Props) => (
  <div className={cn('mx-auto w-full max-w-content px-6 tablet:px-12', className)}>{children}</div>
);
