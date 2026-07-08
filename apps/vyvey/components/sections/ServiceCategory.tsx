import Image from 'next/image';
import { iconMap } from '@/components/icons/iconMap';
import { cn } from '@/lib/cn';
import type { Dienst } from '@/lib/content';

type Props = { dienst: Dienst; reversed: boolean };

/** Eén dienst-categorie: groot beeld + icoon + beschrijving, zijden alternerend. */
export const ServiceCategory = ({ dienst, reversed }: Props) => {
  const Icon = iconMap[dienst.icon];
  return (
    <article
      className={cn(
        'flex flex-col gap-8 overflow-hidden rounded-lg p-6 tablet:flex-row tablet:items-center tablet:gap-10 tablet:p-10 desktop:gap-[72px] desktop:p-[72px]',
        dienst.surface === 'cream' ? 'bg-cream' : 'bg-white',
        dienst.shadow && 'shadow-card-soft',
        reversed && 'tablet:flex-row-reverse',
      )}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg tablet:w-[45%] desktop:w-[55%]">
        <Image
          src={dienst.image.src}
          alt={dienst.image.alt}
          fill
          sizes="(max-width: 810px) 100vw, (max-width: 1200px) 45vw, 55vw"
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <Icon className="h-7 w-auto text-ink" />
        <h3 className="mt-4 text-[28px] font-semibold text-ink">{dienst.title}</h3>
        <p className="mt-4 text-base leading-[1.5] text-ink">{dienst.body}</p>
      </div>
    </article>
  );
};
