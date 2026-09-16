'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { APP_NAV, activeHref } from '../../lib/bureau/routes';
import { SyncStatus } from '../feedback/SyncStatus';
import { SignOutButton } from '../auth/SignOutButton';

type AppHeaderProps = {
  title: string;
  /** Knoppen die alleen op deze pagina bestaan. Ze staan binnen de `<header>`, vóór de navigatie. */
  children?: ReactNode;
};

/**
 * De kop van elke pagina: titel, opslaan-status, paginaknoppen, navigatie en uitloggen.
 * Eén plek, zodat de drie bestemmingen overal dezelfde vorm en volgorde hebben.
 */
export function AppHeader({ title, children }: AppHeaderProps) {
  const active = activeHref(usePathname(), APP_NAV);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <SyncStatus />
        {children}
        <nav aria-label="Hoofdnavigatie" className="flex items-center gap-2">
          {APP_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-muted',
                active === item.href ? 'bg-muted text-foreground' : 'bg-background',
                focusRing,
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </div>
    </header>
  );
}
