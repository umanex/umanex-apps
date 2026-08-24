import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CopyLink } from '@/lib/copy';

type Props = {
  /** 1-based volgnummer zoals het op het scherm staat, niet de array-index. */
  number: number;
  title: string;
  body: string;
  /** Korte kwalificatie naast de titel — prijs, duur, minimumtermijn. */
  meta?: string;
  link?: CopyLink;
};

// Eén genummerde stap. Gebruikt voor de ladder op /aanbod en voor het verloop op /scan.
export const NumberedStep = ({ number, title, body, meta, link }: Props) => (
  <li className="flex gap-4">
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-primary"
    >
      {number}
    </span>
    <div className="space-y-2 pb-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {meta && <p className="text-sm font-medium text-primary">{meta}</p>}
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
      {link && (
        <Link
          href={link.href}
          className="group inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          {link.label}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  </li>
);
