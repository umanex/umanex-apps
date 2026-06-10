export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  organisation: string;
  /** true zolang de quote placeholder is en door Jeroen aangeleverd moet worden */
  draft: boolean;
};

// TODO: echte testimonials aanleveren (quote, naam, rol, bedrijf, toestemming) — input van Jeroen.
export const testimonials: Testimonial[] = [
  {
    quote:
      '[Placeholder — quote van een PM, design lead of product lead over de samenwerking, bij voorkeur over het hele design proces of het stakeholder-werk.]',
    name: '[Naam]',
    role: '[Rol]',
    organisation: '[Bedrijf]',
    draft: true,
  },
  {
    quote:
      '[Placeholder — tweede quote, bij voorkeur met een ander accent: snelheid, AI-werkwijze of kwaliteit van oplevering.]',
    name: '[Naam]',
    role: '[Rol]',
    organisation: '[Bedrijf]',
    draft: true,
  },
];
