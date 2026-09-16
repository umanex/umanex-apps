'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { BUREAU_NAV, activeHref } from '../../lib/bureau/routes';

/** De zeven bureau-pagina's. Routes, geen tabpanelen — elke pagina heeft een eigen adres. */
export function BureauSubnav() {
  const active = activeHref(usePathname(), BUREAU_NAV);

  return (
    <nav aria-label="Bureau" className="max-w-full overflow-x-auto">
      <ul className="inline-flex h-10 items-center gap-1 rounded-md bg-muted p-1">
        {BUREAU_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active === item.href ? 'page' : undefined}
              className={cn(
                'inline-flex h-8 items-center whitespace-nowrap rounded-sm px-3 text-sm transition-colors',
                active === item.href
                  ? 'bg-background font-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                focusRing,
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
