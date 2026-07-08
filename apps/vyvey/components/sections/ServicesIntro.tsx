import { AccentRule } from '@/components/ui/AccentRule';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { iconMap } from '@/components/icons/iconMap';
import { RevealGroup } from '@/components/motion/RevealGroup';
import { RevealItem } from '@/components/motion/RevealItem';
import { Reveal } from '@/components/motion/Reveal';
import { servicesIntro, usps } from '@/lib/content';

/** USP-intro: titel + light subtitle + accent-line, daarna 3 USP-cards. */
export const ServicesIntro = () => (
  <Section surface="cream">
    <Container>
      <Reveal className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-[28px] font-semibold text-ink">{servicesIntro.title}</h2>
        <p className="text-2xl font-light text-ink">{servicesIntro.subtitle}</p>
        <AccentRule className="mt-2" />
      </Reveal>

      <RevealGroup
        as="ul"
        className="mt-12 grid grid-cols-1 gap-8 tablet:mt-16 desktop:grid-cols-3 desktop:gap-16"
      >
        {usps.map((usp) => {
          const Icon = iconMap[usp.icon];
          return (
            <RevealItem as="li" key={usp.id} className="h-full">
              <Card className="flex h-full flex-col">
                <Icon className="h-7 w-auto text-ink" />
                <h3 className="mt-4 text-lg font-semibold text-ink">{usp.title}</h3>
                <p className="mt-3 text-base leading-[1.25] text-ink">{usp.body}</p>
              </Card>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </Container>
  </Section>
);
