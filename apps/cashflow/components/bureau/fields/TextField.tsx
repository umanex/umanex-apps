'use client';

import type { ReactNode } from 'react';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { cn } from '@umanex/ui/lib/utils';

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'month';
  hint?: ReactNode;
  error?: string;
  placeholder?: string;
  /** Suggesties uit bestaande waarden, via een `<datalist>`. */
  suggestions?: string[];
  disabled?: boolean;
  className?: string;
};

export function TextField({ id, label, value, onChange, type = 'text', hint, error, placeholder, suggestions, disabled, className }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-fout` : undefined;
  const listId = suggestions?.length ? `${id}-suggesties` : undefined;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        list={listId}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className={cn(error && 'border-destructive')}
      />
      {listId && (
        <datalist id={listId}>
          {suggestions!.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
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
