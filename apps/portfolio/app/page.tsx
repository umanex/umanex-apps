import { Hero } from '@/components/sections/Hero';
import { ClientStrip } from '@/components/sections/ClientStrip';
import { KeyMessages } from '@/components/sections/KeyMessages';
import { CasesTeaser } from '@/components/sections/CasesTeaser';
import { Testimonials } from '@/components/sections/Testimonials';
import { ContactSection } from '@/components/sections/ContactSection';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ClientStrip />
      <KeyMessages />
      <CasesTeaser />
      <Testimonials />
      <ContactSection />
    </>
  );
}
