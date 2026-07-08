import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

/** Witte solid-knop (Verstuur) — bedoeld op de donkere contactsectie. */
export const Button = ({ className, type = 'button', ...props }: Props) => (
  <button
    type={type}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-field bg-white px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-60',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
      className,
    )}
    {...props}
  />
);
