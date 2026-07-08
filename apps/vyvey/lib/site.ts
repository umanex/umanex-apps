/** Bedrijfsgegevens Vyvey — single source of truth voor contact, meta en footer. */
export const site = {
  name: 'Vyvey',
  legalName: 'Vyvey — het andere interieur',
  tagline: 'het andere interieur',
  url: 'https://www.vyveyinterieur.be',
  description:
    'Totaalinrichting, interieur, decoratie & decoratiewerken. Met passie & expertise creëren wij uw droominterieur!',
  address: {
    street: 'Hogedijkenstraat 1',
    postalCity: 'BE - 8490 Jabbeke',
    locality: 'Jabbeke',
    postalCode: '8490',
    country: 'BE',
  },
  phone: {
    display: '050 81 35 89',
    href: 'tel:+3250813589',
  },
  email: 'miekevyvey@skynet.be',
  vat: 'BTW BE 0824.546.223',
  openingHours: [
    { text: 'Maandag, zon- en feestdagen gesloten', emphasis: true },
    { text: 'Dinsdag - zaterdag', emphasis: true },
    { text: '09:30 - 12:00', emphasis: false },
    { text: 'Namiddag op afspraak', emphasis: false },
  ],
  umanexUrl: 'https://umanex.be',
} as const;
