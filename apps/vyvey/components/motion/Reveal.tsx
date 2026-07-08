'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { appearFadeUp, VIEWPORT } from '@/lib/motion';

const TAGS = { div: motion.div, section: motion.section, li: motion.li, span: motion.span } as const;

type Props = {
  children: ReactNode;
  variants?: Variants;
  as?: keyof typeof TAGS;
  className?: string;
};

/** Wrapper die één element fade-up'd bij scroll-into-view; statisch bij reduced-motion. */
export const Reveal = ({ children, variants = appearFadeUp, as = 'div', className }: Props) => {
  const reduce = useReducedMotion();
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  const Tag = TAGS[as];
  return (
    <Tag className={className} variants={variants} initial="hidden" whileInView="visible" viewport={VIEWPORT}>
      {children}
    </Tag>
  );
};
