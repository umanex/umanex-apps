import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

type Props = SelectHTMLAttributes<HTMLSelectElement> & { tone?: 'light' | 'onDark' };

export const Select = ({ className, tone = 'onDark', children, ...props }: Props) => (
  <div className="relative">
    <select
      className={cn(
        'w-full appearance-none rounded-field px-5 py-3 pr-10 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-offset-0',
        tone === 'onDark'
          ? 'bg-white/20 text-white focus-visible:ring-white/60 [&>option]:text-ink'
          : 'border border-ink/15 bg-white text-ink focus-visible:ring-accent',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2',
        tone === 'onDark' ? 'text-white/70' : 'text-ink/50',
      )}
    />
  </div>
);
