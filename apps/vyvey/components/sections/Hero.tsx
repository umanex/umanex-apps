import Image from 'next/image';
import { Wordmark } from '@/components/icons';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { RevealGroup } from '@/components/motion/RevealGroup';
import { RevealItem } from '@/components/motion/RevealItem';
import { hero } from '@/lib/content';

/** Hero: 4-beeld collage met wordmark + tagline-overlay op het grootbeeld. */
export const Hero = () => {
  const { groot, portret, kleinBoven, kleinOnder } = hero.images;
  return (
    <Section as="div" className="py-6 tablet:py-10 desktop:py-12">
      <Container>
        <RevealGroup className="flex flex-col gap-4 desktop:h-[560px] desktop:flex-row">
          <RevealItem className="relative aspect-[3/2] overflow-hidden rounded-lg desktop:aspect-auto desktop:flex-[1.6]">
            <Image
              src={groot.src}
              alt={groot.alt}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-graphite/60 via-graphite/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 text-white tablet:p-8">
              <Wordmark className="h-10 w-auto tablet:h-14" title="Vyvey, het andere interieur" />
              <h1 className="max-w-sm text-[22px] font-semibold leading-none">{hero.tagline}</h1>
            </div>
          </RevealItem>

          <RevealItem className="relative aspect-[3/4] overflow-hidden rounded-lg desktop:aspect-auto desktop:flex-1">
            <Image src={portret.src} alt={portret.alt} fill sizes="(max-width: 1200px) 100vw, 25vw" className="object-cover" />
          </RevealItem>

          <div className="flex flex-row gap-4 desktop:flex-1 desktop:flex-col">
            <RevealItem className="relative aspect-[4/3] flex-1 overflow-hidden rounded-lg desktop:aspect-auto">
              <Image src={kleinBoven.src} alt={kleinBoven.alt} fill sizes="(max-width: 1200px) 50vw, 25vw" className="object-cover" />
            </RevealItem>
            <RevealItem className="relative aspect-[4/3] flex-1 overflow-hidden rounded-lg desktop:aspect-auto">
              <Image src={kleinOnder.src} alt={kleinOnder.alt} fill sizes="(max-width: 1200px) 50vw, 25vw" className="object-cover" />
            </RevealItem>
          </div>
        </RevealGroup>
      </Container>
    </Section>
  );
};
