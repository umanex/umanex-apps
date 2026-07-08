import Image from 'next/image';
import { Pill } from '@/components/ui/Pill';
import type { Person } from '@/lib/content';

type Props = { person: Person };

/** Teamlid: vierkant portret + naam + rol-pills. */
export const PersonCard = ({ person }: Props) => (
  <div className="flex flex-col gap-6 tablet:flex-row tablet:items-center">
    <div className="relative aspect-square w-full overflow-hidden rounded-lg tablet:w-44 tablet:shrink-0">
      <Image
        src={person.image.src}
        alt={person.image.alt}
        fill
        sizes="(max-width: 810px) 100vw, 176px"
        className="object-cover"
      />
    </div>
    <div>
      <h3 className="text-[22px] font-semibold text-ink">{person.name}</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {person.roles.map((role) => (
          <li key={role}>
            <Pill>{role}</Pill>
          </li>
        ))}
      </ul>
    </div>
  </div>
);
