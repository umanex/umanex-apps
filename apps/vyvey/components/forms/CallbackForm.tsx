'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormStatus } from '@/components/feedback/FormStatus';
import { contactSection } from '@/lib/content';
import { WEEKDAYS } from '@/lib/contact-schema';

type Status = 'idle' | 'submitting' | 'success' | 'error';
type FieldErrors = Partial<Record<'naam' | 'telefoon', string>>;

/** Terugbel-formulier: naam + telefoon (verplicht), voorkeurdag, voor-/namiddag. */
export const CallbackForm = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const naam = String(data.get('naam') ?? '').trim();
    const telefoon = String(data.get('telefoon') ?? '').trim();

    const nextErrors: FieldErrors = {};
    if (!naam) nextErrors.naam = 'Vul je naam in.';
    if (!telefoon) nextErrors.telefoon = 'Vul je telefoonnummer in.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naam,
          telefoon,
          dag: String(data.get('dag') ?? '') || undefined,
          voormiddag: data.get('voormiddag') === 'on',
          namiddag: data.get('namiddag') === 'on',
          website: String(data.get('website') ?? ''),
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      form.reset();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return <FormStatus variant="success" />;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-base font-bold text-white">{contactSection.formIntro}</p>

      <Field label="Naam" htmlFor="naam" required error={errors.naam}>
        <Input
          id="naam"
          name="naam"
          type="text"
          placeholder="Uw naam"
          autoComplete="name"
          aria-required="true"
          aria-invalid={errors.naam ? true : undefined}
          aria-describedby={errors.naam ? 'naam-error' : undefined}
        />
      </Field>

      <Field label="Telefoon" htmlFor="telefoon" required error={errors.telefoon}>
        <Input
          id="telefoon"
          name="telefoon"
          type="tel"
          placeholder="Uw telefoonnummer"
          autoComplete="tel"
          aria-required="true"
          aria-invalid={errors.telefoon ? true : undefined}
          aria-describedby={errors.telefoon ? 'telefoon-error' : undefined}
        />
      </Field>

      <Field label="Voorkeurdag" htmlFor="dag">
        <Select id="dag" name="dag" defaultValue="">
          <option value="" disabled>
            Kies een dag...
          </option>
          {WEEKDAYS.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-white">Voorkeurmoment</legend>
        <div className="flex gap-6">
          <Checkbox id="voormiddag" name="voormiddag" label="Voormiddag" />
          <Checkbox id="namiddag" name="namiddag" label="Namiddag" />
        </div>
      </fieldset>

      {/* Honeypot — verborgen voor gebruikers, gevuld door bots. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === 'error' ? <FormStatus variant="error" /> : null}

      <Button type="submit" disabled={status === 'submitting'} className="mt-2 self-start">
        {status === 'submitting' ? 'Verzenden…' : 'Verstuur'}
      </Button>
    </form>
  );
};
