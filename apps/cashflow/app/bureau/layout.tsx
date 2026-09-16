'use client';

import type { ReactNode } from 'react';
import { AppHeader } from '../../components/layout/AppHeader';
import { BureauSubnav } from '../../components/bureau/BureauSubnav';
import { YearSelector } from '../../components/bureau/YearSelector';
import { useBureauUi } from '../../store/bureau-ui';

export default function BureauLayout({ children }: { children: ReactNode }) {
  const announcement = useBureauUi((s) => s.announcement);

  return (
    <main className="min-h-screen space-y-6 bg-background px-4 py-8">
      <AppHeader title="Bureau" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BureauSubnav />
        <YearSelector />
      </div>
      <div data-bureau-page className="space-y-6">
        {children}
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </main>
  );
}
