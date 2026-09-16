'use client';

import type { ReactNode } from 'react';
import { Textarea } from '@umanex/ui/components/ui/textarea';
import { Label } from '@umanex/ui/components/ui/label';
import { cn } from '@umanex/ui/lib/utils';

type TextareaFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  placeholder?: string;
  className?: string;
};

export function TextareaField({ id, label, value, onChange, hint, placeholder, className }: TextareaFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-describedby={hintId} />
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
