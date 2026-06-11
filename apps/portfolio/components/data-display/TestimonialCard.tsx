import { Quote } from 'lucide-react';
import type { Testimonial } from '@/lib/testimonials';
import { PlaceholderNote } from '@/components/feedback/PlaceholderNote';

type Props = {
  testimonial: Testimonial;
};

export const TestimonialCard = ({ testimonial }: Props) => (
  <figure className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
    <Quote className="h-6 w-6 text-primary" aria-hidden="true" />
    <blockquote className="text-muted-foreground">{testimonial.quote}</blockquote>
    <figcaption className="mt-auto text-sm">
      <span className="font-semibold">{testimonial.name}</span>
      <span className="text-muted-foreground">
        {' '}
        — {testimonial.role}, {testimonial.organisation}
      </span>
    </figcaption>
    {testimonial.draft && <PlaceholderNote>Echte quote volgt</PlaceholderNote>}
  </figure>
);
