/**
 * De startinhoud van het bedrijfsplan 2027: 22 acties, hun afhankelijkheden, vier
 * beslismomenten en de startvoorwaarden.
 *
 * Dit bestand is de opdracht, letterlijk overgenomen — geen afgeleide en geen samenvatting.
 * Het wordt één keer gezaaid (`seed.ts`) en daarna nooit meer over de database geschreven:
 * vanaf dat moment is de database de waarheid en dit bestand alleen nog de herkomst.
 *
 * Vandaar `SEED_VERSIE`. Een latere versie mag uitsluitend **nieuwe** keys toevoegen; een
 * bestaande key of een bestaande kant aanpassen zou een bewerking van Jeroen overschrijven,
 * en dat is precies wat de opdracht verbiedt.
 */

/** Verhogen mag alleen bij het toevoegen van nieuwe keys. Zie de kop van dit bestand. */
export const SEED_VERSIE = 1

export type Prioriteit = 1 | 2 | 3 | 4

export const PRIORITEIT_LABEL: Record<Prioriteit, string> = {
  1: 'Hoofdproduct verkoopbaar maken',
  2: 'Rechtstreekse verkoop voorbereiden en toetsen',
  3: 'Levering en bedrijfsvoering voorbereiden',
  4: 'Aanbod gericht verbreden',
}

export type SeedActie = {
  key: string
  prioriteit: Prioriteit
  titel: string
  resultaat: string
  gereedcriterium: string
  /** Wat er al bestaat buiten de app om. Nooit hetzelfde als bewijs. */
  context?: string
  /** Alleen prioriteit 4: die starten uitgesteld met hun aanleiding als wachtreden. */
  uitgesteldOmdat?: string
}

/**
 * De volgorde binnen een prioriteitsgroep is de volgorde in deze lijst — dat is ook de
 * volgorde waarin de opdracht ze noemt, en die draagt betekenis (A01 vóór A02).
 */
export const SEED_ACTIES: readonly SeedActie[] = [
  // Prioriteit 1 — Hoofdproduct verkoopbaar maken
  {
    key: 'A01',
    prioriteit: 1,
    titel: 'Workflowaanbod afbakenen',
    resultaat: 'Een concrete standaardscope.',
    gereedcriterium:
      'Resultaten, rollen, uitzonderingen, feedbackrondes en uitsluitingen zijn vastgelegd.',
    context: 'Er is een conceptaanbod. Dat is een vertrekpunt, geen afgeronde scope.',
  },
  {
    key: 'A02',
    prioriteit: 1,
    titel: 'Leveringsbudget toetsen',
    resultaat: 'Een onderbouwde tijdsbandbreedte voor een standaardtraject.',
    gereedcriterium:
      'Vergelijkbaar werk onderbouwt een tijdsbandbreedte, inclusief overleg, controle, revisies en herstel.',
    context: 'Het portfolio uitwerken is hiervoor niet nodig.',
  },
  {
    key: 'A03',
    prioriteit: 1,
    titel: 'Prijs en uitbreidingen bepalen',
    resultaat: 'Eén vaste prijs die je kan verdedigen, met een duidelijke grens eraan.',
    gereedcriterium:
      'Eén vaste prijs kan verantwoord geoffreerd worden en het is duidelijk wanneer aanvullende begroting nodig is.',
  },
  {
    key: 'A04',
    prioriteit: 1,
    titel: 'Diagnose als voorfase afwerken',
    resultaat: 'Een afgebakende voorfase met eigen opbrengst en prijs.',
    gereedcriterium:
      'Het is duidelijk wanneer voorafgaand onderzoek nodig is, wat dat oplevert en wat het kost.',
  },
  {
    key: 'A05',
    prioriteit: 1,
    titel: 'Offertemodel voorbereiden',
    resultaat: 'Een structuur waarin een concreet voorstel past.',
    gereedcriterium:
      'Een passend voorstel kan gemaakt worden zonder de structuur opnieuw te ontwerpen.',
  },
  {
    key: 'A06',
    prioriteit: 1,
    titel: 'Opdrachtvoorwaarden uitwerken en laten toetsen',
    resultaat: 'Voorwaarden die een traject dragen, juridisch nagekeken.',
    gereedcriterium:
      'Betaling, scopewijzigingen, vertraging, aansprakelijkheid en gebruiksrechten zijn geregeld.',
    context:
      'De juridische toetsing gebeurt buiten deze app en telt pas wanneer je ze hier zelf vastlegt.',
  },

  // Prioriteit 2 — Rechtstreekse verkoop voorbereiden en toetsen
  {
    key: 'A07',
    prioriteit: 2,
    titel: 'Eerste twintig bedrijven selecteren',
    resultaat: 'Twintig bedrijven met een reden om ze nú aan te spreken.',
    gereedcriterium:
      'Elk bedrijf heeft een passende activiteit, een concrete aanleiding en een vermoedelijke beslisser.',
    context: 'Koppel de geselecteerde bedrijven aan deze actie vanuit het dashboard.',
  },
  {
    key: 'A08',
    prioriteit: 2,
    titel: 'Contactaanpak finaliseren',
    resultaat: 'Een aanpak die je kan herhalen zonder hem elke keer te bedenken.',
    gereedcriterium:
      'Eerste benadering, opvolging, stopregels en het toepasselijke kanaal- en gegevensgebruik zijn gecontroleerd.',
  },
  {
    key: 'A09',
    prioriteit: 2,
    titel: 'Minimale publieke informatie actualiseren',
    resultaat: 'Wat een prospect vindt, klopt met wat je verkoopt.',
    gereedcriterium:
      'De informatie die prospects vinden sluit aan op de huidige positionering en het hoofdproduct.',
    context: 'Een volledige websitevernieuwing is hiervoor niet vereist.',
  },
  {
    key: 'A10',
    prioriteit: 2,
    titel: 'Eerste gesprekken voeren',
    resultaat: 'Een eerste reeks echte gesprekken, geëvalueerd.',
    gereedcriterium:
      'De eerste reeks gesprekken is geëvalueerd op behoefte, urgentie, budget en besluitvorming.',
    context: 'Gesprekken en berichten start je zelf; deze app verstuurt niets.',
  },
  {
    key: 'A11',
    prioriteit: 2,
    titel: 'Concrete voorstellen toetsen',
    resultaat: 'Echte reacties op een echt voorstel.',
    gereedcriterium: 'Werkelijke reacties op scope, prijs en voorwaarden zijn vastgelegd.',
  },
  {
    key: 'A12',
    prioriteit: 2,
    titel: 'Campagne evalueren',
    resultaat: 'Een beslissing over selectie, boodschap en aanbod.',
    gereedcriterium:
      'Er is besloten welke selectie, boodschap of aanbieding behouden of aangepast wordt.',
    context:
      'Verbind hier de resultaten uit A11 wanneer die er zijn. Bewust geen afhankelijkheid van A11: als geen enkel voorstel passend bleek, mag de evaluatie tóch doorgaan.',
  },

  // Prioriteit 3 — Levering en bedrijfsvoering voorbereiden
  {
    key: 'A13',
    prioriteit: 3,
    titel: 'Projectstart en overdracht standaardiseren',
    resultaat: 'Een bruikbare structuur van intake tot oplevering.',
    gereedcriterium:
      'Intake, beslissingen, status, controles en oplevering hebben een bruikbare structuur.',
  },
  {
    key: 'A14',
    prioriteit: 3,
    titel: 'Cashplanning verduidelijken',
    resultaat: 'Een kasbeeld zonder dubbeltellingen.',
    gereedcriterium:
      'Bestaande uitgaven, reserveringen en ontvangsten zijn zonder dubbeltelling verwerkt.',
    context: 'De circa €11.000 maandelijkse behoefte moet nog uitgesplitst worden.',
  },
  {
    key: 'A15',
    prioriteit: 3,
    titel: 'Stuurdashboard uitbreiden',
    resultaat: 'Kernberekeningen die op de echte brongegevens staan.',
    gereedcriterium:
      'De kernberekeningen werken en sluiten aan op de brongegevens in de bestaande cashflow-app.',
    context:
      'Verwijstaak. Hiervoor bestaat een aparte ontwikkelprompt; het dashboard wordt niet in Jobradar gebouwd. Geen harde startvoorwaarde.',
  },
  {
    key: 'A16',
    prioriteit: 3,
    titel: 'Achtervang organiseren',
    resultaat: 'Iemand die kan inspringen, met afspraken eromheen.',
    gereedcriterium: 'Beschikbaarheid, bevoegdheden, kosten en toegang zijn afgesproken.',
  },
  {
    key: 'A17',
    prioriteit: 3,
    titel: 'Overdracht beproeven',
    resultaat: 'Bewijs dat de overdracht in de praktijk werkt.',
    gereedcriterium:
      'Een afgebakende taak kan met beperkte aanvullende uitleg worden overgenomen.',
  },

  // Prioriteit 4 — Aanbod gericht verbreden (start uitgesteld)
  {
    key: 'A18',
    prioriteit: 4,
    titel: 'Conceptvalidatie definitief begroten',
    resultaat: 'Een onderbouwde scope en prijs voor conceptvalidatie.',
    gereedcriterium: 'Onderzoek, prototype en iteratie hebben een onderbouwde scope en prijs.',
    uitgesteldOmdat: 'Oppakken wanneer het aanbod actief nodig is.',
  },
  {
    key: 'A19',
    prioriteit: 4,
    titel: 'Design-systempakket toetsen',
    resultaat: 'Een pakket dat je zelfstandig kan verkopen.',
    gereedcriterium:
      'Componentenset, integraties, klantaanpassingen en tijdsbudget liggen vast.',
    uitgesteldOmdat: 'Oppakken vóór een concrete offerte of een eigen campagne.',
  },
  {
    key: 'A20',
    prioriteit: 4,
    titel: 'Vervolgbegeleiding testen',
    resultaat: 'Een vervolgaanbod met een grens eraan.',
    gereedcriterium: 'Prestaties, ondersteuning en interne capaciteit zijn begrensd.',
    uitgesteldOmdat: 'Oppakken bij een concrete vervolgbehoefte.',
  },
  {
    key: 'A21',
    prioriteit: 4,
    titel: 'Portfolio en cases bouwen',
    resultaat: 'Cases die je mag tonen en die kloppen.',
    gereedcriterium: 'Claims, materiaal en gebruikstoestemming zijn gecontroleerd.',
    uitgesteldOmdat: 'Bewust voor een latere fase.',
  },
  {
    key: 'A22',
    prioriteit: 4,
    titel: 'Zelfstandig umanex-os-aanbod onderzoeken',
    resultaat: 'Zicht op of umanex-os los verkoopbaar is.',
    gereedcriterium: 'Gebruik, ondersteuningslast en betalingsbereidheid zijn onderbouwd.',
    uitgesteldOmdat: 'Oppakken bij aantoonbare vraag naar zelfstandig gebruik.',
  },
]

/**
 * Actie → de acties waarvan ze afhangt. Achttien kanten, uit de opdracht.
 *
 * A12 hangt bewust alleen van A10 af en niet van A11: de opdracht wil een vroege evaluatie
 * niet blokkeren wanneer nog geen enkel voorstel passend was.
 */
export const SEED_AFHANKELIJKHEDEN: Readonly<Record<string, readonly string[]>> = {
  A02: ['A01'],
  A03: ['A01', 'A02'],
  A04: ['A01'],
  A05: ['A03', 'A04'],
  A06: ['A05'],
  A08: ['A07'],
  A10: ['A05', 'A06', 'A07', 'A08', 'A09'],
  A11: ['A10'],
  A12: ['A10'],
  A13: ['A01'],
  A16: ['A13'],
  A17: ['A16'],
}

/**
 * De acties die gereed moeten zijn vóór een verantwoorde start in januari 2027.
 *
 * Dit is een lijst om tegen af te lezen, geen automatische conclusie: het startbesluit zelf
 * is een record in `plan_decisions` dat Jeroen invult. De app besluit nooit dat het bedrijf
 * financieel of juridisch klaar is.
 */
export const HARDE_STARTVOORWAARDEN = [
  'A01',
  'A02',
  'A03',
  'A04',
  'A05',
  'A06',
  'A13',
  'A14',
] as const

/** Deze acties moeten genoeg bewijs geven om de verkoopverwachting te beoordelen. */
export const BEWIJS_STARTVOORWAARDEN = ['A07', 'A08', 'A09', 'A10', 'A11', 'A12'] as const

/** Een volledig stuurdashboard is geen harde startvoorwaarde. */
export const NIET_VEREIST_VOOR_START = ['A15'] as const

export type SeedBeslissing = {
  key: string
  soort: 'beslismoment' | 'start'
  titel: string
  vraag: string
  acties: readonly string[]
}

export const SEED_BESLISSINGEN: readonly SeedBeslissing[] = [
  {
    key: 'B01',
    soort: 'beslismoment',
    titel: 'Klaar om verantwoord te offreren',
    vraag: 'Kan ik een helder voorstel doen waarvan ik de leveringslast kan dragen?',
    acties: ['A01', 'A02', 'A03', 'A04', 'A05', 'A06'],
  },
  {
    key: 'B02',
    soort: 'beslismoment',
    titel: 'Commerciële aanpak behouden of aanpassen',
    vraag: 'Ontstaan er gekwalificeerde kansen en concrete aankoopbeslissingen?',
    acties: ['A07', 'A08', 'A09', 'A10', 'A11', 'A12'],
  },
  {
    key: 'B03',
    soort: 'beslismoment',
    titel: 'Aanbod na uitvoering herbeoordelen',
    vraag: 'Kloppen scope, kwaliteit, werkelijke inzet en opbrengst?',
    // Geen gekoppelde acties: dit is een handmatige evaluatie ná de eerste afgeronde
    // trajecten, en die vallen buiten dit voorbereidingsplan.
    acties: [],
  },
  {
    key: 'START',
    soort: 'start',
    titel: 'Startbesluit januari 2027',
    vraag: 'Is de voorbereiding ver genoeg om te starten zoals gepland?',
    acties: HARDE_STARTVOORWAARDEN,
  },
]
