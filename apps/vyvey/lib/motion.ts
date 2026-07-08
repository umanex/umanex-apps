import type { Variants } from 'framer-motion';

// Easing verbatim uit de originele Framer-bundle (shared-lib, symbool `yo`).
// Overige params (opacity/translateY/duration/delay/stagger) zijn best-estimate
// Framer-appear-defaults, getuned per sectie-type.
const FRAMER_EASE: [number, number, number, number] = [0.44, 0, 0.56, 1];

/** Single element fade-up — hero-content, headings, tekstblokken. */
export const appearFadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: FRAMER_EASE, delay: 0 } },
};

/** Beeld/media — grotere lift, lichte delay zodat media de heading natrekt. */
export const appearMedia: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: FRAMER_EASE, delay: 0.08 } },
};

/** Staggered container — USP-cards, dienst-blokken, contact/uren-lijst. */
export const appearStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0, staggerChildren: 0.09 } },
};

export const appearStaggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: FRAMER_EASE } },
};

/** Gedeelde viewport-config: animeer één keer, wanneer ~25% zichtbaar is. */
export const VIEWPORT = { once: true, amount: 0.25 } as const;
