import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string };

export const Checkbox = ({ id, label, className, ...props }: Props) => (
  <label htmlFor={id} className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-white">
    <input
      id={id}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-white/40 bg-white/20 accent-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-0',
        className,
      )}
      {...props}
    />
    {label}
  </label>
);
