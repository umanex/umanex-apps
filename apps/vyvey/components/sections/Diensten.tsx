import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { RevealGroup } from '@/components/motion/RevealGroup';
import { RevealItem } from '@/components/motion/RevealItem';
import { ServiceCategory } from './ServiceCategory';
import { diensten } from '@/lib/content';

/** Dienstcategorieën: 3 alternerende image+text blokken (#diensten). */
export const Diensten = () => (
  <Section id="diensten">
    <Container>
      <h2 className="sr-only">Diensten</h2>
      <RevealGroup className="flex flex-col gap-8 tablet:gap-12 desktop:gap-16">
        {diensten.map((dienst, index) => (
          <RevealItem key={dienst.id}>
            <ServiceCategory dienst={dienst} reversed={index % 2 === 1} />
          </RevealItem>
        ))}
      </RevealGroup>
    </Container>
  </Section>
);
