'use client';

import type { ReactNode } from 'react';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { cn } from '@umanex/ui/lib/utils';

type NumberFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Eenheid achter het veld: "€", "d", "u", "%". */
  unit?: string;
  hint?: ReactNode;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Een getalveld dat tekst vasthoudt — zie `lib/bureau/goals-draft.ts`. `type="text"` met
 * `inputMode="decimal"` in plaats van `type="number"`: die laatste weigert "200.000" en "7,5",
 * precies zoals iemand in België typt, en geeft dan een lege waarde door zonder melding.
 */
export function NumberField({ id, label, value, onChange, unit, hint, error, placeholder, disabled, className }: NumberFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-fout` : undefined;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={cn('text-right tabular-nums', error && 'border-destructive')}
        />
        {unit && <span className="w-4 shrink-0 text-sm text-muted-foreground">{unit}</span>}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
