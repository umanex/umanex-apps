import Image from 'next/image';
import { IconContact, IconOpeningsuren } from '@/components/icons';
import { Container } from '@/components/ui/Container';
import { CallbackForm } from '@/components/forms/CallbackForm';
import { Reveal } from '@/components/motion/Reveal';
import { contactSection } from '@/lib/content';
import { site } from '@/lib/site';

/** Contact / inspiratie-CTA: full-bleed achtergrond, witte tekst, info + uren + form. */
export const Contact = () => (
  <section id="contact" className="relative isolate overflow-hidden">
    <Image
      src={contactSection.background.src}
      alt=""
      aria-hidden="true"
      fill
      sizes="100vw"
      className="absolute inset-0 -z-10 object-cover"
    />
    <div className="absolute inset-0 -z-10 bg-graphite/80" aria-hidden="true" />

    <Container className="py-16 tablet:py-20 desktop:py-[88px]">
      <div className="grid grid-cols-1 gap-12 desktop:grid-cols-2 desktop:gap-[72px]">
        <Reveal className="text-white">
          <h2 className="text-[28px] font-semibold">{contactSection.inspiratieTitle}</h2>

          <div className="mt-8 flex items-start gap-3">
            <IconContact className="mt-1 h-6 w-auto shrink-0" />
            <div>
              <h3 className="text-lg font-semibold">Contact</h3>
              <address className="mt-2 text-sm not-italic leading-relaxed text-white">
                {site.address.street}
                <br />
                {site.address.postalCity}
                <br />
                <a href={site.phone.href} className="hover:underline">
                  {site.phone.display}
                </a>
                <br />
                <a href={`mailto:${site.email}`} className="hover:underline">
                  {site.email}
                </a>
                <br />
                {site.vat}
              </address>
            </div>
          </div>

          <div className="mt-8 flex items-start gap-3">
            <IconOpeningsuren className="mt-1 h-6 w-auto shrink-0" />
            <div>
              <h3 className="text-lg font-semibold">Openingsuren</h3>
              <ul className="mt-2 space-y-0.5 text-sm text-white">
                {site.openingHours.map((line) => (
                  <li key={line.text} className={line.emphasis ? 'font-bold' : undefined}>
                    {line.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <CallbackForm />
        </Reveal>
      </div>
    </Container>
  </section>
);
