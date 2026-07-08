'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import type { NavItem } from '@/lib/content';

type Props = { items: NavItem[] };

export const MobileNav = ({ items }: Props) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="tablet:hidden">
      <button
        type="button"
        aria-label={open ? 'Menu sluiten' : 'Menu openen'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open ? (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-16 z-40 border-t border-ink/10 bg-white/95 shadow-card backdrop-blur-md"
        >
          <nav aria-label="Mobiele navigatie">
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.href} className="border-b border-ink/5 last:border-b-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-6 py-4 text-sm font-semibold uppercase tracking-wide text-ink transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
};
