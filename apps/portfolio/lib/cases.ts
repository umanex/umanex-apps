export type CaseStudy = {
  slug: string;
  title: string;
  context: string;
  summary: string;
  problem: string;
  approach: string;
  result: string;
  stack: string[];
  draft: boolean;
};

// TODO: case-copy is draft — inhoudelijk te valideren door Jeroen (open vraag in briefing)
export const caseStudies: CaseStudy[] = [
  {
    slug: 'rowtrack',
    title: 'RowTrack',
    context: 'Eigen product — mobile app',
    summary:
      'Roei-tracker die via Bluetooth met de ergometer praat. Gestart als eigen onderzoek naar BLE-integratie en gamification, uitgegroeid tot volwaardige app.',
    problem:
      'Roeidata zit vast in het scherm van de ergometer: geen historiek, geen progressie, geen motivatie om vol te houden.',
    approach:
      'Volledig product design en development door één persoon met AI-werkwijze: gestructureerde briefings per feature, eigen design tokens, en AI-agents die binnen vaste conventies componenten bouwen.',
    result:
      'Werkende app met live BLE-koppeling, sessie-historiek en progressie-tracking — gebouwd in de tijd die anders alleen al naar het design zou gaan.',
    stack: ['React Native', 'Expo', 'BLE', 'Supabase'],
    draft: true,
  },
  {
    slug: 'cashflow',
    title: 'Cashflow',
    context: 'Eigen product — web app',
    summary:
      'Persoonlijke cashflow-prognosetool voor freelancers: inkomsten, BTW-reserveringen en jaarlijkse kosten in één vooruitblik.',
    problem:
      'Freelancers zien hun banksaldo, niet hun werkelijke ruimte: BTW, sociale bijdragen en jaarlijkse kosten maken het saldo misleidend.',
    approach:
      'Van probleemstelling naar werkend prototype met dezelfde pipeline als klantwerk: tokens als bron van waarheid, component library, en snelle iteraties op echte eigen data.',
    result:
      'Dagelijks bruikbare prognosetool die in dagen stond in plaats van weken — en als case toont hoe de werkwijze schaalt naar B2B-schermen.',
    stack: ['Next.js', 'TypeScript', 'Tailwind', 'design tokens'],
    draft: true,
  },
];

export const getCaseStudy = (slug: string): CaseStudy | undefined =>
  caseStudies.find((caseStudy) => caseStudy.slug === slug);
