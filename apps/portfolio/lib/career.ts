export type CareerEntry = {
  period: string;
  role: string;
  organisation: string;
  description: string;
  /** true zolang de inhoud placeholder is en door Jeroen ingevuld moet worden */
  draft: boolean;
};

// TODO: carrière-feiten invullen — periodes, rollen, sectoren en eventuele opleiding (input van Jeroen).
// Volgorde: meest recent eerst.
export const careerEntries: CareerEntry[] = [
  {
    period: '[Periode]',
    role: 'Freelance UX/UI designer — Design Team Of One',
    organisation: 'umanex',
    description:
      'Eigen label voor klantwerk en eigen producten. Volledige product design proces, van onderzoek tot werkende code, versterkt met een AI-werkwijze.',
    draft: true,
  },
  {
    period: '[Periode]',
    role: '[Rol bij Columba]',
    organisation: 'Columba',
    description:
      '[Placeholder — jouw rol en verantwoordelijkheden; kern: centrale repository van waaruit specifieke apps gebouwd worden.]',
    draft: true,
  },
  {
    period: '[Periode]',
    role: '[Rol bij Luminus]',
    organisation: 'Luminus',
    description: '[Placeholder — jouw rol en verantwoordelijkheden.]',
    draft: true,
  },
  {
    period: '[Periode]',
    role: '[Rol bij Adhese]',
    organisation: 'Adhese',
    description: '[Placeholder — jouw rol en verantwoordelijkheden.]',
    draft: true,
  },
  {
    period: '[Periode]',
    role: '[Eerdere rol of opleiding]',
    organisation: '[Organisatie]',
    description: '[Placeholder — aan te vullen of te schrappen.]',
    draft: true,
  },
];
