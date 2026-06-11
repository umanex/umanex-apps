export type KeyMessage = {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
};

export const keyMessages: KeyMessage[] = [
  {
    title: 'Het hele design proces',
    body: 'Van gebruikersonderzoek en prototypes tot design systems en kwaliteitsbewaking tijdens development. Eén aanspreekpunt dat het volledige traject beheert — geen overdrachten, geen vertaalverlies.',
    href: '/carriere',
    linkLabel: 'Bekijk mijn parcours',
  },
  {
    title: 'Stakeholders in complexe omgevingen',
    body: 'B2B software betekent veel stemmen rond de tafel: product, development, business, eindgebruikers. Ik breng die samen — ook wanneer belangen botsen of de scope blijft schuiven.',
    href: '/cases',
    linkLabel: 'Lees de cases',
  },
  {
    title: 'Innovatie met AI',
    body: 'Geen AI als buzzword maar als werkwijze: gestructureerde briefings, design tokens als bron van waarheid en agents die binnen vaste conventies bouwen. Deze site draait erop.',
    href: '/werkwijze',
    linkLabel: 'Zo werk ik',
  },
];
