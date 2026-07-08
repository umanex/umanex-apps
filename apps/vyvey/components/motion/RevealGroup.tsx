'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { appearStaggerContainer, VIEWPORT } from '@/lib/motion';

const TAGS = { div: motion.div, ul: motion.ul, ol: motion.ol } as const;

type Props = { children: ReactNode; as?: keyof typeof TAGS; className?: string };

/** Stagger-container: laat z'n RevealItem-kinderen na elkaar inkomen. */
export const RevealGroup = ({ children, as = 'div', className }: Props) => {
  const reduce = useReducedMotion();
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  const Tag = TAGS[as];
  return (
    <Tag
      className={className}
      variants={appearStaggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </Tag>
  );
};
