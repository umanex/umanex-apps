/** Alle paginacopy + sectie-data, verbatim overgenomen van de live Framer-site. */

export type NavItem = { label: string; href: string };

export const nav: NavItem[] = [
  { label: 'Diensten', href: '#diensten' },
  { label: 'Over ons', href: '#over-ons' },
  { label: 'Contact', href: '#contact' },
];

export const hero = {
  // 22px tagline, wit op het grootbeeld, naast de wordmark.
  tagline: 'Met passie & expertise creëren wij uw droominterieur.',
  images: {
    groot: { src: '/images/hero-groot.png', width: 2420, height: 1600, alt: 'Sfeervol ingericht interieur door Vyvey' },
    portret: { src: '/images/hero-portret.png', width: 800, height: 1200, alt: 'Detail van een interieurinrichting van Vyvey' },
    kleinBoven: { src: '/images/hero-klein-boven.jpg', width: 4096, height: 1928, alt: 'Interieurproject van Vyvey' },
    kleinOnder: { src: '/images/hero-klein-onder.jpg', width: 4096, height: 2639, alt: 'Interieurrealisatie door Vyvey' },
  },
} as const;

export const servicesIntro = {
  title: 'Vyvey, het andere interieur',
  subtitle: 'een klantgerichte aanpak',
} as const;

export type IconKey =
  | 'advies'
  | 'persoonlijkContact'
  | 'kwaliteit'
  | 'totaalinrichting'
  | 'interieurDecoratie'
  | 'decoratie';

export type Usp = { id: string; title: string; icon: IconKey; body: string };

export const usps: Usp[] = [
  {
    id: 'advies',
    title: 'Advies',
    icon: 'advies',
    body: 'Van kleuren tot materialen, wij begeleiden u als ervaren interieurvormgevers bij het kiezen van de ideale producten die uw ruimte transformeren. U kunt daarbij vertrouwen op onze degelijke vakkennis. Met oog voor detail en uitstraling.',
  },
  {
    id: 'persoonlijk-contact',
    title: 'Persoonlijk contact',
    icon: 'persoonlijkContact',
    body: 'We nemen de tijd om naar uw wensen te luisteren en streven naar een perfecte match tussen u en het eindresultaat. Van 1 ruimte tot een volledige woning op uw maat en binnen uw stijl. In onze showroom heerst een huiselijke en familiale sfeer met steeds dezelfde contactpersoon.',
  },
  {
    id: 'kwaliteit',
    title: 'Kwaliteit voor elk budget',
    icon: 'kwaliteit',
    body: 'Onze oplossingen garanderen altijd topkwaliteit die passen binnen uw budget. Uw project toevertrouwen aan Vyvey zorgt voor een esthetische meerwaarde van al uw interieurprojecten. U krijgt kwaliteit en service zonder zorgen.',
  },
];

export type DienstImage = { src: string; width: number; height: number; alt: string };
export type Dienst = {
  id: string;
  title: string;
  icon: IconKey;
  body: string;
  image: DienstImage;
  surface: 'cream' | 'white';
  shadow?: boolean;
};

export const diensten: Dienst[] = [
  {
    id: 'totaalinrichting',
    title: 'Totaalinrichting',
    icon: 'totaalinrichting',
    surface: 'cream',
    image: { src: '/images/dienst-totaalinrichting.jpg', width: 4096, height: 4096, alt: 'Totaalinrichting van een woning door Vyvey' },
    body: 'Wij richten uw interieur in van A tot Z, van eerste advies in de showroom, naar ontwerp tot uitvoering van uw project. Van uw huis maken wij een nieuwe thuis, geheel volgens uw wensen.',
  },
  {
    id: 'interieur-decoratie',
    title: 'Interieur & decoratie',
    icon: 'interieurDecoratie',
    surface: 'white',
    image: { src: '/images/dienst-interieur-decoratie.jpg', width: 4096, height: 3218, alt: 'Interieur en decoratie met raam-, muur- en vloerbekleding' },
    body: 'Creëer een unieke sfeer met onze persoonlijke selectie aan kwalitatieve raam-muur-vloerbekleding. Een stijlvol aanbod volgens de laatste trends strekt zich van het aanpakken van één element tot combinaties van verschillende elementen: de juiste verf, muurbekleding in de mooiste texturen (linnen, jute, zijde, fluweel, geweven gras..), panorama’s, zonwering, gordijnen, tapijt, karpet, laminaat, vinyl… En dit in uiteenlopende stijlen en prachtige kleurpaletten. Onze plaatsingsdienst bestaat uit een team met ervaren vaklui waarin de zaakvoerder steeds mee werkt. Ook voor wie zelf graag de handen uit de mouwen steekt kan bij ons terecht voor de aankoop van materialen.',
  },
  {
    id: 'decoratiewerken',
    title: 'Decoratiewerken',
    icon: 'decoratie',
    surface: 'cream',
    shadow: true,
    image: { src: '/images/dienst-decoratiewerken.jpg', width: 1200, height: 800, alt: 'Decoratie- en schilderwerken door Vyvey' },
    body: 'Voor een thuis vol stijl: professioneel schilderen binnen als buiten, kaleien gevels, behangwerken, plaatsen vloerbekledingen… met kwalitatieve materialen voor elk project! Wij geven niet zomaar een likje verf. Onze persoonlijke manier van werken: eerst de inspiratie en een moodboard, het technisch advies en pas daarna de uitvoering van de werken.',
  },
];

export type Person = {
  id: string;
  name: string;
  image: DienstImage;
  roles: string[];
};

export const overOns = {
  title: 'Over ons',
  intro:
    'Vyvey - het andere interieur is een trots familiebedrijf met meer dan 50 jaar ervaring in decoratie. Bij ons staat Mieke aan het roer van klantcontact en persoonlijk advies, terwijl Erik garant staat voor de kwalitatieve uitvoering van uw projecten. Onze focus ligt op advies op maat, waarbij we ruim de tijd nemen om in gesprek te gaan en uw wensen grondig te begrijpen. Zo zorgen wij ervoor dat uw decoratiedromen werkelijkheid worden met de finesse en expertise die u verdient.',
  people: [
    {
      id: 'mieke',
      name: 'Mieke',
      image: { src: '/images/team-mieke.png', width: 1024, height: 1024, alt: 'Mieke, interieurarchitect en vast contactpersoon bij Vyvey' },
      roles: ['Interieurarchitect', 'Onthaal showroom', 'Persoonlijke aanpak', 'Uw vaste contactpersoon'],
    },
    {
      id: 'erik',
      name: 'Erik',
      image: { src: '/images/team-erik.png', width: 1024, height: 1024, alt: 'Erik, interieurarchitect en uitvoerder bij Vyvey' },
      roles: ['Interieurarchitect', 'Schilder - behanger', 'Totaalaanpak', 'Steeds aanwezig op de werkvloer'],
    },
  ] satisfies Person[],
} as const;

export const contactSection = {
  inspiratieTitle: 'Nood aan inspiratie?',
  formIntro: 'Bel mij terug om een afspraak in te plannen:',
  background: { src: '/images/contact-achtergrond.png', width: 2880, height: 1200, alt: '' },
} as const;

export const legalLinks: NavItem[] = [
  { label: 'Algemene voorwaarden', href: '/algemene-voorwaarden' },
  { label: 'Privacy', href: '/privacy' },
];
