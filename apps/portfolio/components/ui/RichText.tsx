import Link from 'next/link';
import type { RichSegment } from '@/lib/copy';

type Props = {
  segments: readonly RichSegment[];
};

// Rendert copy met inline links uit lib/copy.ts — bedoeld binnen een <p>
export const RichText = ({ segments }: Props) => (
  <>
    {segments.map((segment, index) =>
      'link' in segment ? (
        <Link
          key={index}
          href={segment.link.href}
          className="underline hover:text-foreground"
        >
          {segment.link.label}
        </Link>
      ) : (
        <span key={index}>{segment.text}</span>
      ),
    )}
  </>
);
