import { Hero } from '@/components/sections/Hero';
import { ServicesIntro } from '@/components/sections/ServicesIntro';
import { Diensten } from '@/components/sections/Diensten';
import { OverOns } from '@/components/sections/OverOns';
import { Contact } from '@/components/sections/Contact';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesIntro />
      <Diensten />
      <OverOns />
      <Contact />
    </>
  );
}
