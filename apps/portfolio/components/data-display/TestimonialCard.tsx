import { Quote } from 'lucide-react';
import { Card } from '@umanex/ui/components/ui/card';
import type { Testimonial } from '@/lib/testimonials';
import { PlaceholderNote } from '@/components/feedback/PlaceholderNote';

type Props = {
  testimonial: Testimonial;
};

export const TestimonialCard = ({ testimonial }: Props) => (
  <Card className="flex flex-col gap-4 rounded-xl p-6 shadow-none">
    <Quote className="h-6 w-6 text-primary" aria-hidden="true" />
    <blockquote className="text-muted-foreground">{testimonial.quote}</blockquote>
    <div className="mt-auto text-sm">
      <span className="font-semibold">{testimonial.name}</span>
      <span className="text-muted-foreground">
        {' '}
        — {testimonial.role}, {testimonial.organisation}
      </span>
    </div>
    {testimonial.draft && <PlaceholderNote>Echte quote volgt</PlaceholderNote>}
  </Card>
);
