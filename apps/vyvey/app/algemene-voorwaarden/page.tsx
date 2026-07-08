import type { Metadata } from 'next';
import { LegalPlaceholder } from '@/components/sections/LegalPlaceholder';

export const metadata: Metadata = {
  title: 'Algemene voorwaarden',
  robots: { index: false },
};

export default function AlgemeneVoorwaardenPage() {
  return <LegalPlaceholder title="Algemene voorwaarden" />;
}
