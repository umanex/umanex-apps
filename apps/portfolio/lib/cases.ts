export type CaseKind = 'klantwerk' | 'eigen-werk';

export type CaseStudy = {
  slug: string;
  title: string;
  kind: CaseKind;
  context: string;
  summary: string;
  problem: string;
  approach: string;
  result: string;
  stack: string[];
  /** true zolang de copy placeholder is en door Jeroen ingevuld moet worden */
  draft: boolean;
};

// TODO: placeholder-copy (gemarkeerd met […]) invullen — input van Jeroen vereist.
// Klantnamen Adhese, Luminus en Columba zijn goedgekeurd om te vermelden (2026-06-10).
export const caseStudies: CaseStudy[] = [
  {
    slug: 'columba',
    title: 'Columba',
    kind: 'klantwerk',
    context: 'Klantwerk',
    summary:
      'Eén centrale repository als fundament waaruit specifieke apps gebouwd worden — gedeelde tokens, componenten en conventies over alle apps heen.',
    problem:
      '[Placeholder — welk probleem loste de centrale repository op: versnippering tussen apps, dubbel werk, inconsistentie? Concreet maken met de situatie vóór de aanpak.]',
    approach:
      'Een centrale repository met design tokens en een gedeelde component library als bron van waarheid; specifieke apps worden daaruit opgebouwd in plaats van telkens van nul te starten. [Placeholder — jouw rol, de stakeholders en hoe de aanpak tot stand kwam.]',
    result:
      '[Placeholder — wat leverde het op: snellere oplevering van nieuwe apps, consistentie, minder onderhoud? Liefst met een concreet, observeerbaar resultaat.]',
    stack: ['Design system', 'Design tokens', 'Component library', 'Monorepo'],
    draft: true,
  },
  {
    slug: 'luminus',
    title: 'Luminus',
    kind: 'klantwerk',
    context: 'Klantwerk — energie',
    summary:
      '[Placeholder — één zin: wat deed je bij Luminus en waarom is het relevant voor een hiring-beslisser?]',
    problem: '[Placeholder — de uitdaging bij aanvang.]',
    approach:
      '[Placeholder — jouw aanpak, met aandacht voor het stakeholder-verhaal: wie zat rond de tafel, wat maakte de omgeving complex?]',
    result: '[Placeholder — het observeerbare resultaat.]',
    stack: [],
    draft: true,
  },
  {
    slug: 'adhese',
    title: 'Adhese',
    kind: 'klantwerk',
    context: 'Klantwerk — adtech',
    summary:
      '[Placeholder — één zin: wat deed je bij Adhese en waarom is het relevant voor een hiring-beslisser?]',
    problem: '[Placeholder — de uitdaging bij aanvang.]',
    approach: '[Placeholder — jouw aanpak en rol in het team.]',
    result: '[Placeholder — het observeerbare resultaat.]',
    stack: [],
    draft: true,
  },
  {
    slug: 'umanex-os',
    title: 'umanex-os',
    kind: 'eigen-werk',
    context: 'Eigen werk — AI-werkwijze',
    summary:
      'Het besturingssysteem achter mijn manier van werken: gelaagde werkprincipes, gestructureerde design-briefings en een tokens-pipeline die AI-agents productief maakt. Implementeer ik ook bij klanten.',
    problem:
      'AI-tools leveren pas team-output als ze binnen vaste conventies werken. Zonder structuur krijg je snelle maar inconsistente resultaten die meer review kosten dan ze opleveren.',
    approach:
      'Eén gelaagd systeem van werkprincipes (globaal → klant → project), een briefing-skeleton dat designs beschrijft in een vorm die developers én agents direct kunnen uitvoeren, en design tokens als enige bron van waarheid tussen Figma en code.',
    result:
      'Eén designer die consistent de output van een klein team levert — en een werkwijze die overdraagbaar is: dezelfde structuur zet ik op bij klanten die hun eigen design-AI-werkwijze willen opbouwen.',
    stack: ['AI-agents', 'Design tokens', 'Figma ↔ code', 'Werkprincipes'],
    draft: false,
  },
  {
    slug: 'rowtrack',
    title: 'RowTrack',
    kind: 'eigen-werk',
    context: 'Eigen werk — mobile app',
    summary:
      'Roei-tracker die via Bluetooth met de ergometer praat. Volledig product design en development door één persoon, gebouwd met de umanex-os werkwijze.',
    problem:
      'Roeidata zit vast in het scherm van de ergometer: geen historiek, geen progressie, geen motivatie om vol te houden.',
    approach:
      'Elk feature start met een gestructureerde briefing, eigen design tokens, en AI-agents die binnen vaste conventies componenten bouwen — hetzelfde proces als bij klantwerk.',
    result:
      'Werkende app met live BLE-koppeling, sessie-historiek en progressie-tracking — het bewijs dat de werkwijze van briefing tot gelanceerd product draagt.',
    stack: ['React Native', 'Expo', 'BLE', 'Supabase'],
    draft: true,
  },
];

export const getCaseStudy = (slug: string): CaseStudy | undefined =>
  caseStudies.find((caseStudy) => caseStudy.slug === slug);

export const clientCases = caseStudies.filter((c) => c.kind === 'klantwerk');
export const ownWorkCases = caseStudies.filter((c) => c.kind === 'eigen-werk');
