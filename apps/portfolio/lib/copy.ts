import { site } from '@/lib/site';

export type CopyLink = {
  label: string;
  href: string;
};

// Inline opmaak binnen lopende tekst — gerenderd door components/ui/RichText.tsx
export type RichSegment = { text: string } | { link: CopyLink };

// Prijsdiscipline uit het bureau-plan (briefings/2026-08-24-feature-bureau-positionering.tcebc.md):
// het woord "abonnement" of "retainer" komt hier niet voor — die categorie zit in België op
// €249–1.295 per maand en wie het woord gebruikt verdedigt daarna een factor zes. Capaciteit
// staat in dagen; het enige umanex-bedrag op de site is de scan.
export const copy = {
  meta: {
    root: {
      title: 'umanex — designcapaciteit voor B2B-productbedrijven',
      titleTemplate: '%s — umanex',
      description:
        'Designcapaciteit in dagen per maand voor bedrijven met meer softwareproducten dan designers: één gedeelde componentlaag, en een systeem dat bewaakt dat wat eruit komt klopt.',
    },
    aanbod: {
      title: 'Aanbod',
      description:
        'Designcapaciteit in dagen per maand: de ladder van scan naar afgebakend traject naar capaciteit, met de voorwaarden erbij.',
    },
    scan: {
      title: 'De scan',
      description:
        'Twee dagen werk, vanaf €1.750, en één meetpunt dat je over twaalf maanden opnieuw kan meten. Volledig verrekend als er een opdracht op volgt.',
    },
    cases: {
      title: 'Cases',
      description:
        'Klantwerk bij onder meer Adhese, Luminus en Columba, en eigen werk dat de werkwijze van briefing tot gelanceerd product toont.',
    },
    carriere: {
      title: 'Carrière',
      description:
        'Het parcours achter umanex: ruime ervaring over het hele design proces in B2B software, van gebruikersonderzoek tot design systems.',
    },
    werkwijze: {
      title: 'Werkwijze — het systeem onder de capaciteit',
      description:
        'umanex-os: gelaagde werkprincipes, gestructureerde briefings en design tokens als bron van waarheid — het systeem dat in jouw repo komt te staan, niet in mijn hoofd.',
    },
  },

  header: {
    brand: {
      name: site.owner,
      suffix: site.name,
    },
    // Vier items plus de thema-toggle. Carrière stond hier tot 2026-08-24 en verhuisde naar de
    // footer: de site spreekt sinds de herpositionering een koper aan, geen werkgever.
    nav: [
      { label: 'Aanbod', href: '/aanbod' },
      { label: 'Cases', href: '/cases' },
      { label: 'Werkwijze', href: '/werkwijze' },
      { label: 'Contact', href: '/#contact' },
    ],
  },

  footer: {
    vatLabel: 'BTW',
    linkedinLabel: 'LinkedIn',
    linksLabel: 'Op deze site',
    links: [
      { label: 'Aanbod', href: '/aanbod' },
      { label: 'De scan', href: '/scan' },
      { label: 'Cases', href: '/cases' },
      { label: 'Werkwijze', href: '/werkwijze' },
      { label: 'Carrière', href: '/carriere' },
    ],
    tagline: [
      {
        text: 'Deze site is gebouwd met mijn eigen design tokens, component library en AI-agents — hetzelfde systeem dat ik bij teams opzet. ',
      },
      { link: { label: 'Zo werk ik', href: '/werkwijze' } },
      { text: '.' },
    ],
  },

  home: {
    hero: {
      eyebrow: 'Designcapaciteit voor B2B-productbedrijven',
      title: 'Meer producten dan designers',
      intro:
        'Vier interfaces en een halve designer: dan groeien je producten uit elkaar en bedenkt elk team hetzelfde opnieuw. Ik lever de capaciteit om dat om te keren — één gedeelde componentlaag, ingekocht in dagen per maand, met een systeem eronder dat bewaakt dat wat eruit komt klopt en samenhangt.',
      cta: { label: 'Bekijk het aanbod', href: '/aanbod' },
      secondaryCta: { label: 'Begin met een scan', href: '/scan' },
    },
    clientStrip: {
      intro: 'Werkte onder meer voor',
      clients: ['Adhese', 'Luminus', 'Columba'],
    },
    keyMessages: {
      title: 'Waarom dit een capaciteitsvraag is en geen projectvraag',
      items: [
        {
          title: 'Niet de productie is schaars, het oordeel',
          body: 'Bouwen is goedkoop geworden. Ervaren developers blijken met AI 19% trager op echt werk, terwijl ze schatten dat ze 20% sneller zijn (METR, 2025). Dat gat van 39 procentpunt is het probleem. Wat schaars werd is beoordelen wat eruit komt — en kunnen aantonen dat het klopt.',
          link: { label: 'Zo werk ik', href: '/werkwijze' },
        },
        {
          title: 'Capaciteit, geen project',
          body: 'Een project zet je na elke oplevering terug op nul. Je koopt een vast aantal dagen per maand, minimum drie maanden, daarna maandelijks opzegbaar. In januari weet je hoe april eruitziet — ik ook, en daar hangt mijn planning aan.',
          link: { label: 'Bekijk het aanbod', href: '/aanbod' },
        },
        {
          title: 'Eén componentlaag, en ze blijft van jou',
          body: 'Design tokens als enige bron van waarheid tussen Figma en code, één gedeelde componentlaag over je producten heen, en briefings die je developers én je agents kunnen uitvoeren. De conventies staan in jouw repo, niet in mijn hoofd.',
          link: { label: 'Lees de cases', href: '/cases' },
        },
      ],
    },
    casesTeaser: {
      title: 'Werk waar je iets aan hebt',
      subtitle:
        'Klantwerk in complexe B2B-omgevingen, en eigen werk waar de volledige werkwijze zichtbaar is — van briefing tot gelanceerd product.',
      linkLabel: 'Alle cases',
    },
    testimonials: {
      title: 'Wat samenwerken met mij oplevert',
    },
    contact: {
      title: 'Begin met de scan',
      body: 'Twee dagen werk, één rapport, en één cijfer dat je over twaalf maanden opnieuw kan meten. Pas daarna beslis je of er capaciteit op volgt. Liever eerst even praten? Bel of mail gerust.',
      cta: { label: 'Vraag de scan aan' },
      secondaryCta: { label: 'Wat de scan oplevert', href: '/scan' },
      linkedinLabel: 'LinkedIn',
    },
  },

  aanbod: {
    hero: {
      eyebrow: 'Aanbod',
      title: 'Designcapaciteit, in dagen per maand',
      subtitle:
        'Je koopt geen project maar een vast aantal dagen. Waar die dagen naartoe gaan bepalen we samen, elke maand opnieuw — meestal eerst een gedeelde componentlaag, daarna de producten die er het verst van af staan.',
    },
    fit: {
      title: 'Is dit voor jou?',
      forTitle: 'Ja, als',
      forItems: [
        'je meer dan één softwarepakket in productie hebt draaien',
        'je een eigen repo hebt en meerdere developers',
        'je hoogstens één of twee designers hebt, of geen',
        'je met 20 tot 100 mensen bent',
        'je zelf over dit soort uitgaven kan beslissen, zonder aanbesteding',
      ],
      againstTitle: 'Nee, als',
      againstItems: [
        'je één scherm of één landingspagina zoekt',
        'je één product hebt en een designer die het aankan',
        'je een vaste prijs voor een vaste scope wil — dan past een afgebakend traject beter, en dat kan ook',
      ],
    },
    ladder: {
      title: 'Drie stappen, in deze volgorde',
      intro:
        'Niemand tekent capaciteit bij iemand die hij nog niet aan het werk zag. Elke stap verlaagt de drempel voor de volgende, en na elke stap kan je stoppen.',
      steps: [
        {
          title: 'De scan',
          meta: 'vanaf €1.750 · twee dagen',
          body: 'Ik meet waar je componentlaag vandaag staat en leg één cijfer vast dat je over twaalf maanden opnieuw kan meten. Volgt er een opdracht op, dan gaat het scanbedrag integraal van de eerste maand af. Volgt er niets, dan houd je het rapport.',
          link: { label: 'Wat de scan precies oplevert', href: '/scan' },
        },
        {
          title: 'Een afgebakend traject',
          meta: 'vaste scope · 50% bij start',
          body: 'Eén product, één deliverable, een einddatum. Zo weet je hoe het werkt vóór je iets herhalends tekent — en weet ik of het bij jullie past.',
        },
        {
          title: 'Capaciteit per maand',
          meta: 'minimum drie maanden',
          body: 'Een vast aantal dagen per maand, daarna maandelijks opzegbaar met één maand opzeg. Dit is waar het model voor gebouwd is.',
        },
      ],
    },
    tiers: {
      title: 'Drie tredes',
      intro:
        'Het verschil zit in het aantal dagen, niet in wat je krijgt. Je begint waar je vandaag staat en schuift op wanneer het werk erom vraagt.',
      items: [
        {
          name: 'Instap',
          days: '5 tot 6 dagen per maand',
          body: 'Audit, tokenlaag en één product. Genoeg om een gedeelde basis te leggen en te zien of de manier van werken bij je team past.',
        },
        {
          name: 'Kern',
          days: '9 tot 10 dagen per maand',
          body: 'Een design system over meerdere producten, met de kwaliteitsbewaking tijdens development erbij. Hier komen de meeste bedrijven met vier interfaces terecht.',
        },
        {
          name: 'Uitbreiding',
          days: '14 dagen per maand of meer',
          body: 'Meerdere sporen tegelijk. Alleen wanneer de capaciteit aan mijn kant er ook echt staat — ik verkoop geen dagen die ik niet heb.',
        },
      ],
      note: 'De prijs per trede krijg je in het gesprek, samen met wat er in die dagen gebeurt. Wat er niet gebeurt, staat hieronder.',
    },
    terms: {
      title: 'De voorwaarden, vooraf',
      items: [
        'Het aantal dagen staat in het contract. Onbeperkte verzoeken bestaan niet aan deze prijs — bij niemand, en wie het belooft rekent op je terughoudendheid.',
        'Dagen vervallen per maand, met maximaal één maand doorrol. Een bundel die blijft stapelen is verborgen schuld die ik later gratis lever, en dat breekt precies op het verkeerde moment.',
        'Minimum drie maanden, daarna maandelijks opzegbaar met één maand opzeg.',
        'Loopt het werk over de dagen heen, dan schuift het naar de volgende maand of koop je bij. Jij beslist welke van de twee, niet ik.',
        'Wat er gemaakt wordt is van jou: de componenten, de tokens én de conventies. Ze staan in je eigen repo.',
      ],
    },
    anchor: {
      title: 'Wat het ongeveer kost, eerlijk vergeleken',
      body: [
        'Een design system als project ligt in België rond €60.000, met een mediaan van €15.000 voor kleiner werk. Dat teken je vooraf, in één scope, en je betaalt het of het nu af is of niet.',
        'Capaciteit spreidt datzelfde werk over maanden. Je stopt wanneer het klaar is in plaats van wanneer de scope op is, en je ziet elke maand wat je ervoor terugkreeg.',
      ],
      source:
        'Cijfers uit La Fabrique du Net BE, op 761 reële Belgische projectbudgetten — het enige gepubliceerde Belgische anker voor precies deze deliverable.',
    },
    contact: {
      title: 'De volgende stap is klein',
      body: 'Je hoeft niets te tekenen om te beginnen. De scan is een afgebakende opdracht van twee dagen met een rapport aan het eind.',
      cta: { label: 'Vraag de scan aan' },
      secondaryCta: { label: 'Wat de scan oplevert', href: '/scan' },
    },
  },

  scan: {
    hero: {
      eyebrow: 'Nulmeting',
      title: 'De scan',
      subtitle:
        'Twee dagen werk. Je krijgt geen rapport met bevindingen maar een rapport met een meetpunt: één cijfer dat je over twaalf maanden opnieuw kan meten, zodat je kan zien of er iets veranderd is.',
      price: '€1.750',
      priceLabel: 'voor het eerste product, plus €900 voor elk volgend',
      priceExample: 'Twee producten €2.650 · drie €3.550 · vier €4.450',
      priceNote:
        'Volgt er een opdracht op de scan, dan gaat het volledige bedrag van de eerste maand af. Per saldo betaal je de scan dus alleen wanneer je besluit dat het hierbij blijft.',
    },
    deliverablesTitle: 'Wat je krijgt, en wat niet',
    measures: {
      title: 'Wat ik meet',
      items: [
        'Je componentlaag over al je producten heen: wat er gedeeld is, en wat er drie keer apart bestaat',
        'Waar je interfaces uit elkaar gegroeid zijn, en wat die drift je vandaag kost aan doorlooptijd',
        'Eén nulmeting naar keuze: de doorlooptijd van beslissing tot gepubliceerde, geverifieerde UI — of het aantal drifts tussen je producten',
        'De volgorde: wat je eerst aanpakt, wat kan wachten, en wat je beter laat staan',
      ],
    },
    notThis: {
      title: 'Wat het niet is',
      items: [
        'Geen gratis kennismaking met een offerte eraan vast. Je betaalt ervoor en je houdt het rapport, ook als je verder niets afneemt',
        'Geen slidedeck met bevindingen. Zonder meetpunt is een audit een mening',
        'Geen inventaris van alles. Ik meet wat je over twaalf maanden opnieuw wil kunnen meten, en laat de rest staan',
      ],
    },
    how: {
      title: 'Hoe het loopt',
      steps: [
        {
          title: 'Toegang en drie gesprekken',
          body: 'Lees-toegang tot je repo’s, plus drie gesprekken van een half uur: een developer, een designer of product owner, en jij.',
        },
        {
          title: 'Ik meet',
          body: 'Twee dagen, zonder dat je team eraan meewerkt. Je hoort pas weer iets van me als er wat te melden valt.',
        },
        {
          title: 'Rapport en doorloop',
          body: 'Het rapport met de nulmeting erin, plus een uur om het samen door te lopen. Daarna beslis je zelf of er iets volgt.',
        },
      ],
    },
    contact: {
      title: 'De scan aanvragen',
      body: 'Schrijf kort waar je team aan werkt en hoeveel producten er draaien. Een snelle eerste check leert meestal binnen de dag of de scan bij jullie iets oplevert.',
      cta: { label: 'Vraag de scan aan' },
      secondaryCta: { label: 'Wat er daarna kan volgen', href: '/aanbod' },
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
        'Het parcours achter umanex. Geen lijst van tools maar een traject: het hele design proces, telkens in omgevingen waar veel stakeholders en veel complexiteit samenkomen.',
    },
  },

  werkwijze: {
    hero: {
      eyebrow: 'umanex-os',
      title: 'Het systeem onder de capaciteit',
      subtitle:
        'Bouwen is goedkoop geworden; beoordelen en verifiëren niet. umanex-os is het systeem dat dat gat dicht: gelaagde werkprincipes, briefings die een agent kan uitvoeren, design tokens als enige bron van waarheid, en een verificatiestap die faalt wanneer het werk niet klopt. Deze site draait erop.',
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
          body: 'AI-agents bouwen componenten, prototypes en schermen — maar altijd binnen de conventies van de lagen erboven, en elk resultaat wordt getoetst vóór het meetelt. Ik bewaak UX, kwaliteit en edge cases. Dat is het verschil tussen snelle output en bruikbare output.',
        },
      ],
    },
    forYourTeam: {
      title: 'Het komt in jouw repo te staan',
      body: [
        {
          text: 'umanex-os is geen privé-trucendoos. Dezelfde structuur — werkprincipes, briefings, tokens-pipeline — zet ik op in jouw repo, onder jouw beheer. Stopt de samenwerking, dan blijft het systeem staan en kan je team ermee verder. Deze site en ',
        },
        { link: { label: 'RowTrack', href: '/cases/rowtrack' } },
        { text: ' zijn er de levende demo van.' },
      ],
    },
    contact: {
      title: 'Benieuwd wat dit voor jouw team betekent?',
      cta: { label: 'Bekijk het aanbod', href: '/aanbod' },
    },
  },

  notFound: {
    title: 'Pagina niet gevonden',
    body: 'Deze pagina bestaat niet (meer).',
    link: { label: 'Terug naar home', href: '/' },
  },
} as const;
