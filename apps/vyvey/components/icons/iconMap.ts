import type { ComponentType, SVGProps } from 'react';
import type { IconKey } from '@/lib/content';
import { IconAdvies } from './IconAdvies';
import { IconPersoonlijkContact } from './IconPersoonlijkContact';
import { IconKwaliteit } from './IconKwaliteit';
import { IconTotaalinrichting } from './IconTotaalinrichting';
import { IconInterieurDecoratie } from './IconInterieurDecoratie';
import { IconDecoratie } from './IconDecoratie';

/** Mapt een content-icon-key naar het bijhorende SVG-component. */
export const iconMap: Record<IconKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  advies: IconAdvies,
  persoonlijkContact: IconPersoonlijkContact,
  kwaliteit: IconKwaliteit,
  totaalinrichting: IconTotaalinrichting,
  interieurDecoratie: IconInterieurDecoratie,
  decoratie: IconDecoratie,
};
