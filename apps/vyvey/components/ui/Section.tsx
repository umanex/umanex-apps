import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const surfaces = {
  white: 'bg-white',
  cream: 'bg-cream',
  none: '',
} as const;

type Props = {
  id?: string;
  as?: ElementType;
  surface?: keyof typeof surfaces;
  className?: string;
  children: ReactNode;
};

/** Sectie-wrapper met verticaal ritme + optionele achtergrond (cream/white). */
export const Section = ({ id, as: Tag = 'section', surface = 'none', className, children }: Props) => (
  <Tag id={id} className={cn('py-12 tablet:py-20 desktop:py-[88px]', surfaces[surface], className)}>
    {children}
  </Tag>
);
