import { site } from '@/lib/site';

export type CopyLink = {
  label: string;
  href: string;
};

// Inline opmaak binnen lopende tekst — gerenderd door components/ui/RichText.tsx
export type RichSegment = { text: string } | { link: CopyLink };

export const copy = {
  meta: {
    root: {
      title: 'Jeroen Colpaert — UX/UI designer · umanex',
      titleTemplate: '%s — Jeroen Colpaert',
      description:
        'UX/UI designer met ruime ervaring over het hele design proces in complexe B2B-omgevingen — versterkt met een AI-werkwijze die de output van een klein team levert.',
    },
    cases: {
      title: 'Cases',
      description:
        'Klantwerk bij onder meer Adhese, Luminus en Columba, en eigen werk dat de AI-werkwijze van briefing tot gelanceerd product toont.',
    },
    carriere: {
      title: 'Carrière',
      description:
        'Het parcours van Jeroen Colpaert: ruime ervaring over het hele design proces in B2B software, van gebruikersonderzoek tot design systems.',
    },
    werkwijze: {
      title: 'Werkwijze — Design Team Of One + AI',
      description:
        'umanex-os: gelaagde werkprincipes, gestructureerde briefings en design tokens als bron van waarheid — een AI-werkwijze die ook bij klanten geïmplementeerd kan worden.',
    },
  },

  header: {
    brand: {
      name: site.owner,
      suffix: site.name,
    },
    nav: [
      { label: 'Cases', href: '/cases' },
      { label: 'Carrière', href: '/carriere' },
      { label: 'Werkwijze', href: '/werkwijze' },
      { label: 'Contact', href: '/#contact' },
    ],
  },

  footer: {
    vatLabel: 'BTW',
    linkedinLabel: 'LinkedIn',
    tagline: [
      {
        text: 'Deze site is gebouwd met mijn eigen design tokens, component library en AI-agents — dezelfde werkwijze die ik bij teams opzet. ',
      },
      { link: { label: 'Zo werk ik', href: '/werkwijze' } },
      { text: '.' },
    ],
  },

  home: {
    hero: {
      eyebrow: 'UX/UI designer · umanex',
      name: site.owner,
      intro:
        'Ik help B2B software teams gebruiksvriendelijke functionaliteiten lanceren — met ruime ervaring over het hele design proces, stevige voeten in complexe stakeholder-omgevingen, en een AI-werkwijze die de output van een klein team levert.',
      cta: { label: 'Kennismaken' },
      linkedinLabel: 'LinkedIn',
    },
    clientStrip: {
      intro: 'Werkte onder meer voor',
      clients: ['Adhese', 'Luminus', 'Columba'],
    },
    keyMessages: {
      title: 'Waarom teams mij erbij halen',
      items: [
        {
          title: 'Het hele design proces',
          body: 'Van gebruikersonderzoek en prototypes tot design systems en kwaliteitsbewaking tijdens development. Eén aanspreekpunt dat het volledige traject beheert — geen overdrachten, geen vertaalverlies.',
          link: { label: 'Bekijk mijn parcours', href: '/carriere' },
        },
        {
          title: 'Stakeholders in complexe omgevingen',
          body: 'B2B software betekent veel stemmen rond de tafel: product, development, business, eindgebruikers. Ik breng die samen — ook wanneer belangen botsen of de scope blijft schuiven.',
          link: { label: 'Lees de cases', href: '/cases' },
        },
        {
          title: 'Innovatie met AI',
          body: 'Geen AI als buzzword maar als werkwijze: gestructureerde briefings, design tokens als bron van waarheid en agents die binnen vaste conventies bouwen. Deze site draait erop.',
          link: { label: 'Zo werk ik', href: '/werkwijze' },
        },
      ],
    },
    casesTeaser: {
      title: 'Werk waar je iets aan hebt',
      subtitle:
        'Klantwerk in complexe B2B-omgevingen, en eigen werk dat de AI-werkwijze van begin tot eind toont.',
      linkLabel: 'Alle cases',
    },
    testimonials: {
      title: 'Wat samenwerken met mij oplevert',
    },
    contact: {
      title: 'Kennismaken?',
      body: 'Vertel kort waar je team aan werkt. Een snelle eerste check leert meestal binnen de dag of ik kan helpen.',
      cta: { label: 'Stuur een bericht' },
      linkedinLabel: 'LinkedIn',
    },
  },

  cases: {
    hero: {
      title: 'Cases',
      subtitle:
        'Klantwerk in complexe B2B-omgevingen en eigen werk dat volledig toonbaar is — samen geven ze het eerlijkste beeld van hoe ik werk.',
    },
    clientWorkTitle: 'Klantwerk',
    ownWorkTitle: 'Eigen werk',
  },

  caseDetail: {
    backLabel: 'Alle cases',
    stackLabel: 'Stack',
    metaTitleSuffix: '— case',
    draftNote: 'Case in opbouw — de details worden nog aangevuld',
    sections: {
      problem: 'De uitdaging',
      approach: 'Mijn aanpak',
      result: 'Het resultaat',
    },
  },

  carriere: {
    hero: {
      title: 'Carrière',
      // TODO: intro herschrijven zodra de carrière-feiten (jaren, rollen, sectoren) binnen zijn
      subtitle:
        'Geen lijst van tools maar een parcours: het hele design proces, telkens in omgevingen waar veel stakeholders en veel complexiteit samenkomen.',
    },
  },

  werkwijze: {
    hero: {
      eyebrow: 'umanex-os',
      title: 'Design Team Of One + AI',
      subtitle:
        'Eén designer die het hele product design proces beheert gaf altijd al kortere lijnen en meer consistentie. De AI-werkwijze — umanex-os — voegt daar de uitvoeringssnelheid van een klein team aan toe. Geen losse tools, maar een systeem.',
    },
    principles: {
      title: 'Het werkingsprincipe',
      items: [
        {
          key: 'layers',
          title: 'Gelaagde werkprincipes',
          body: 'Eén operating system voor design werk: globale principes, daarboven klant-specifieke afspraken, daarboven project-context. Agents en collega’s werken binnen dezelfde regels — niets hangt af van wat in iemands hoofd zit.',
        },
        {
          key: 'briefings',
          title: 'Briefings die agents begrijpen',
          body: 'Elk design start met een gestructureerd briefing-skeleton: taak, context, elementen, gedrag en constraints op één pagina. Kort genoeg om te onderhouden, precies genoeg om door developers én AI-agents uitgevoerd te worden.',
        },
        {
          key: 'tokens',
          title: 'Design tokens als bron van waarheid',
          body: 'Kleuren, spacing en typografie leven in één tokens-bestand dat Figma en code synchroon houdt. Eén aanpassing in het design system staat dezelfde dag in elke app.',
        },
        {
          key: 'agents',
          title: 'Agents binnen vaste conventies',
          body: 'AI-agents bouwen componenten, prototypes en schermen — maar altijd binnen de conventies van de lagen erboven. Ik bewaak UX, kwaliteit en edge cases. Dat is het verschil tussen snelle output en bruikbare output.',
        },
      ],
    },
    forYourTeam: {
      title: 'Ook voor jouw team',
      body: [
        {
          text: 'umanex-os is geen privé-trucendoos. Dezelfde structuur — werkprincipes, briefings, tokens-pipeline — zet ik op bij teams die hun eigen design-AI-werkwijze willen opbouwen. Deze site en ',
        },
        { link: { label: 'RowTrack', href: '/cases/rowtrack' } },
        { text: ' zijn er de levende demo van.' },
      ],
    },
    contact: {
      title: 'Benieuwd wat dit voor jouw team betekent?',
      cta: { label: 'Kennismaken' },
    },
  },

  notFound: {
    title: 'Pagina niet gevonden',
    body: 'Deze pagina bestaat niet (meer).',
    link: { label: 'Terug naar home', href: '/' },
  },
} as const;
