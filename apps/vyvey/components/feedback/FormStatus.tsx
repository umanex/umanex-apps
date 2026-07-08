import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { site } from '@/lib/site';

type Props = { variant: 'success' | 'error' };

/** In-form feedback voor het callback-formulier (op de donkere contactsectie). */
export const FormStatus = ({ variant }: Props) => {
  if (variant === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-field bg-white/15 p-5 text-white"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm">
          Bedankt! We bellen je zo snel mogelijk terug om een afspraak in te plannen.
        </p>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-field bg-white/15 p-4 text-white"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-sm">
        Er ging iets mis bij het verzenden. Probeer opnieuw of bel ons op {site.phone.display}.
      </p>
    </div>
  );
};
