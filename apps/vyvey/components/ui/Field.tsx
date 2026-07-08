import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
};

/** Form-veld wrapper: label + control + foutmelding (op donkere contactsectie). */
export const Field = ({ label, htmlFor, error, required, hideLabel, className, children }: Props) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <label htmlFor={htmlFor} className={cn('text-sm font-semibold text-white', hideLabel && 'sr-only')}>
      {label}
      {required ? <span className="text-white/90"> *</span> : null}
    </label>
    {children}
    {error ? (
      <p id={`${htmlFor}-error`} role="alert" className="text-xs text-red-200">
        {error}
      </p>
    ) : null}
  </div>
);
