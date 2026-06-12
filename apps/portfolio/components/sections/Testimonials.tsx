import { Container } from '@/components/layout/Container';
import { Reveal } from '@/components/ui/Reveal';
import { AccentBar } from '@/components/ui/AccentBar';
import { TestimonialCard } from '@/components/data-display/TestimonialCard';
import { copy } from '@/lib/copy';
import { testimonials } from '@/lib/testimonials';

export const Testimonials = () => (
  <section className="border-t border-border bg-muted/40 py-20">
    <Container className="space-y-12">
      <Reveal>
        <AccentBar />
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {copy.home.testimonials.title}
        </h2>
      </Reveal>
      <div className="grid gap-6 sm:grid-cols-2">
        {testimonials.map((testimonial, index) => (
          <Reveal key={testimonial.quote} delay={index * 0.08}>
            <TestimonialCard testimonial={testimonial} />
          </Reveal>
        ))}
      </div>
    </Container>
  </section>
);
