import { cn } from '@/lib/cn';

/** Warm-bruine accent-divider onder titels (64×2px). */
export const AccentRule = ({ className }: { className?: string }) => (
  <span aria-hidden="true" className={cn('block h-0.5 w-16 rounded-full bg-accent', className)} />
);
