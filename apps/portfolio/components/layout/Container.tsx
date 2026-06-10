import { cn } from '@umanex/ui/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const Container = ({ children, className }: Props) => (
  <div className={cn('mx-auto w-full max-w-5xl px-6', className)}>{children}</div>
);
