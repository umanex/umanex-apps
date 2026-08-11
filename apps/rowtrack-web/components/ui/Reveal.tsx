type Props = {
  children: React.ReactNode;
  /** Vertraging in ms, voor een handmatige stagger tussen losse Reveal-blokken. */
  delay?: number;
};

/**
 * Scroll-onthulling — een server-component: dit rendert alleen de marker-class.
 *
 * Het gedrag zit bewust NIET hier. Eén gedeeld inline script in layout.tsx zet
 * `data-revealed` via IntersectionObserver, en de styles staan in globals.css
 * achter de `data-js`-gate. Dat script draait direct na het parsen van de HTML,
 * vóór en onafhankelijk van React-hydration — een React-effect zou betekenen dat
 * álle content onzichtbaar blijft tot de bundel geladen én gehydrateerd is, en
 * permanent bij een gefaalde chunk. Zonder JavaScript of met reduced motion
 * bestaat de verborgen begintoestand helemaal niet.
 */
export const Reveal = ({ children, delay = 0 }: Props) => (
  <div
    className="reveal"
    style={delay ? { transitionDelay: `${delay}ms` } : undefined}
  >
    {children}
  </div>
);
