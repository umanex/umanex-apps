import { z } from 'zod';

/** Dagen waarop teruggebeld kan worden (zondag/maandag = gesloten, dus afwezig). */
export const WEEKDAYS = [
  'Maandag',
  'Dinsdag',
  'Woensdag',
  'Donderdag',
  'Vrijdag',
  'Zaterdag',
] as const;

export const contactSchema = z.object({
  naam: z.string().trim().min(1, 'Vul je naam in.').max(120),
  telefoon: z.string().trim().min(1, 'Vul je telefoonnummer in.').max(40),
  dag: z.enum(WEEKDAYS).optional(),
  voormiddag: z.boolean().default(false),
  namiddag: z.boolean().default(false),
  // Honeypot tegen bots — moet leeg blijven; de server slikt gevulde inzendingen stil.
  website: z.string().max(200).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
