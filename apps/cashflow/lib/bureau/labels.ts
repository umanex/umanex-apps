/** De Nederlandse namen van de bureau-enumeraties. Eén plek, zodat een lijst en een badge hetzelfde woord dragen. */
import type { BudgetStatus, InvoiceKind, OfferType, OpportunityStage, ProjectStatus, TimeLabel, WorkCategory } from './types.ts';

export const CATEGORY_LABEL: Record<WorkCategory, string> = {
  klantwerk: 'Klantwerk',
  verkoop: 'Verkoop en marketing',
  'umanex-os': 'umanex-os',
  administratie: 'Administratie en bedrijfsvoering',
};

export const OFFER_LABEL: Record<OfferType, string> = {
  productdiagnose: 'Productdiagnose (scan)',
  conceptvalidatie: 'Conceptvalidatie',
  workflowtraject: 'Workflowtraject',
  'design-system': 'Design system',
  productbegeleiding: 'Productbegeleiding',
  overig: 'Overig',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  gepland: 'Gepland',
  lopend: 'Lopend',
  gepauzeerd: 'Gepauzeerd',
  afgerond: 'Afgerond',
  geannuleerd: 'Geannuleerd',
};

export const INVOICE_KIND_LABEL: Record<InvoiceKind, string> = {
  voorschot: 'Voorschot',
  termijn: 'Termijn',
  slot: 'Slotfactuur',
  overig: 'Overig',
};

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  besproken: 'Besproken',
  geschat: 'Geschat',
  onbekend: 'Onbekend',
};

export const STAGE_LABEL: Record<OpportunityStage, string> = {
  contact: 'Contact',
  gesprek: 'Gesprek',
  gekwalificeerd: 'Gekwalificeerd',
  voorstel: 'Voorstel',
  gewonnen: 'Gewonnen',
  verloren: 'Verloren',
  geparkeerd: 'Geparkeerd',
};

export const TIME_LABEL_LABEL: Record<TimeLabel, string> = {
  herstel: 'Herstelwerk',
  revisie: 'Revisie',
  ongepland: 'Ongeplande ondersteuning',
};
