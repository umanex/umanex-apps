import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement> & { tone?: 'light' | 'onDark' };

export const Input = ({ className, tone = 'onDark', ...props }: Props) => (
  <input
    className={cn(
      'w-full rounded-field px-5 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-offset-0',
      tone === 'onDark'
        ? 'bg-white/20 text-white placeholder:text-white/90 focus-visible:ring-white/60'
        : 'border border-ink/15 bg-white text-ink placeholder:text-ink/50 focus-visible:ring-accent',
      className,
    )}
    {...props}
  />
);
