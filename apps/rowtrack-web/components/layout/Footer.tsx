import { getTranslations } from 'next-intl/server';
import { site } from '@/lib/site';

type Props = {
  locale: string;
};

/**
 * De voettekst: de verplichte links, het copyright en de merknaam-disclaimer.
 *
 * De disclaimer staat hier én in de compatibiliteitssectie. Dat is geen dubbelop:
 * nominative fair use vraagt dat de niet-affiliatie duidelijk is waar de merknaam
 * gebruikt wordt, en de voettekst is de plek waar iemand hem zoekt die de pagina
 * niet van boven naar beneden leest.
 */
export const Footer = async ({ locale }: Props) => {
  const t = await getTranslations('footer');
  const compat = await getTranslations('compat');

  const links = [
    { href: `/${locale}/privacy`, label: t('privacy') },
    { href: `/${locale}/voorwaarden`, label: t('terms') },
    { href: `/${locale}/support`, label: t('support') },
  ];

  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-fg-secondary underline underline-offset-4 hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <p className="mt-8 text-sm text-fg-tertiary">{compat('disclaimer')}</p>

        <p className="mt-4 text-sm text-fg-tertiary">
          {t('rights')} · {site.organisation.city}, België
        </p>
      </div>
    </footer>
  );
};
