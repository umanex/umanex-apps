import { Hero } from '@/components/sections/Hero';
import { ProblemList } from '@/components/sections/ProblemList';
import { AiApproach } from '@/components/sections/AiApproach';
import { ServicesOverview } from '@/components/sections/ServicesOverview';
import { CasesTeaser } from '@/components/sections/CasesTeaser';
import { ContactSection } from '@/components/sections/ContactSection';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemList />
      <AiApproach />
      <ServicesOverview />
      <CasesTeaser />
      <ContactSection />
    </>
  );
}
