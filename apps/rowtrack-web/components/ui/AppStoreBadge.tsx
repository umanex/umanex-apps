import { site } from '@/lib/site';

type Props = {
  /** Tekst voor de wacht-staat, wanneer de app nog niet in de App Store staat. */
  pendingLabel: string;
  /** Alt-tekst voor de badge zodra hij er is. */
  label: string;
};

/**
 * De App Store-badge, of de eerlijke wacht-staat zolang die er niet is.
 *
 * Er staat bewust GEEN nagemaakte badge in deze repo. Apple's richtlijnen eisen dat
 * je hun eigen artwork gebruikt, onvertaald en ongewijzigd, met minstens een kwart
 * badgehoogte vrije ruimte eromheen. Een zelfgetekende benadering is dus geen
 * placeholder maar een overtreding — en één die er op het scherm precies zo uitziet
 * als het echte werk, dus niemand merkt het meer op.
 *
 * TODO(release): haal de officiële zwarte badge op via Apple's App Store Marketing
 * Tools, zet hem als `public/app-store-badge.svg`, en vul `site.appStore.url`. Zolang
 * die URL null is rendert dit component een wacht-staat in plaats van een dode knop:
 * een badge die nergens heen gaat is erger dan geen badge.
 */
export const AppStoreBadge = ({ pendingLabel, label }: Props) => {
  if (!site.appStore.url) {
    return (
      <p className="inline-flex h-button-primary-height items-center gap-3 rounded-button-primary border border-border-strong bg-bg-raised px-6 text-fg-secondary shadow-button-outline">
        {/* Statusstip: "komt eraan" is een actieve staat, dus de accentrol mag hier.
            animate-pulse is opacity-only en valt bij reduced motion stil op vol. */}
        <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-pill bg-accent" />
        {pendingLabel}
      </p>
    );
  }

  return (
    <a
      href={site.appStore.url}
      className="inline-flex rounded-button-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Apple's badge moet
          onbewerkt geserveerd worden; next/image herschaalt en hercodeert hem. */}
      <img src="/app-store-badge.svg" alt={label} height={56} width={168} />
    </a>
  );
};
