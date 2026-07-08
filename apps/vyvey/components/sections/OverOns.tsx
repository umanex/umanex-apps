import { AccentRule } from '@/components/ui/AccentRule';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/motion/Reveal';
import { RevealGroup } from '@/components/motion/RevealGroup';
import { RevealItem } from '@/components/motion/RevealItem';
import { PersonCard } from './PersonCard';
import { overOns } from '@/lib/content';

/** Over ons: bedrijfsintro + team (Mieke & Erik). */
export const OverOns = () => (
  <Section id="over-ons" surface="cream">
    <Container>
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-[28px] font-semibold text-ink">{overOns.title}</h2>
        <AccentRule className="mx-auto mt-3" />
        <p className="mt-6 text-base leading-[1.5] text-ink">{overOns.intro}</p>
      </Reveal>

      <RevealGroup className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-10 tablet:mt-16 desktop:grid-cols-2 desktop:gap-[72px]">
        {overOns.people.map((person) => (
          <RevealItem key={person.id}>
            <PersonCard person={person} />
          </RevealItem>
        ))}
      </RevealGroup>
    </Container>
  </Section>
);
