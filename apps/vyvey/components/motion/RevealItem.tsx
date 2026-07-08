'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { appearStaggerChild } from '@/lib/motion';

const TAGS = { div: motion.div, li: motion.li } as const;

type Props = { children: ReactNode; as?: keyof typeof TAGS; className?: string };

/** Stagger-kind binnen een RevealGroup — erft de animatie-state van de container. */
export const RevealItem = ({ children, as = 'div', className }: Props) => {
  const reduce = useReducedMotion();
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  const Tag = TAGS[as];
  return (
    <Tag className={className} variants={appearStaggerChild}>
      {children}
    </Tag>
  );
};
