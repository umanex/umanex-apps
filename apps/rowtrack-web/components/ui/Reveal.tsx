'use client';

import { useEffect, useRef } from 'react';

type Props = {
  children: React.ReactNode;
  /** Vertraging in ms, voor een handmatige stagger tussen losse Reveal-blokken. */
  delay?: number;
  className?: string;
};

/**
 * Scroll-onthulling: markeert zichzelf met `data-revealed` zodra hij in beeld komt.
 *
 * Dit is het enige client-component van de motion-laag, en het draagt bewust géén
 * animatie zelf — alle beweging staat in globals.css, achter de `data-js`-gate en
 * een `prefers-reduced-motion`-query. Draait er geen JavaScript, dan bestaat de
 * begintoestand (opacity 0) simpelweg niet en is alles direct zichtbaar; vraagt de
 * bezoeker om minder beweging, dan idem. One-shot: na de eerste onthulling koppelt
 * de observer af, secties verspringen niet opnieuw bij terugscrollen.
 */
export const Reveal = ({ children, delay = 0, className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.dataset.revealed = '';
          observer.disconnect();
        }
      },
      // -10%: onthullen zodra het blok echt de viewport in is, niet al op de rand.
      { rootMargin: '0px 0px -10% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `reveal ${className}` : 'reveal'}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};
