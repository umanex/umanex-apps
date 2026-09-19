// Nederlandse stringtabel — de enige bron voor élke user-facing string, inclusief
// de eenheden (die stonden tot 2026-09-12 verspreid over dertig plaatsen in tien
// bestanden, terwijl deze kopregel het tegendeel beweerde).
// Waarden zijn gewone strings; geparametriseerde meldingen zijn functies, zodat
// meervoudsregels en woordvolgorde in het locale-bestand blijven (een Engelse en.ts
// implementeert dezelfde vorm met zijn eigen logica; `Translations` in ../types.ts
// dwingt dat af).
// Zet hier NOOIT `as const` op: de verbrede types ZIJN het contract voor en.ts.
export const nl = {
  common: {
    save: 'Opslaan',
    cancel: 'Annuleren',
    close: 'Sluiten',
    retry: 'Opnieuw proberen',
    continue: 'Ga verder',
    error: 'Fout',
    saveFailed: (detail: string) => `Opslaan mislukt: ${detail}`,
    saveFailedConnection: 'Opslaan mislukt. Controleer je verbinding.',
  },

  format: {
    decimalSeparator: ',',
    // Punt = duizendtal, komma = decimaal. Eén betekenis per teken: '7.515 m' is
    // een duizendtal, '22,3 km' een decimaal. Beide scheiders staan alleen hier
    // en in lib/formatters.ts (formatInt / formatDecimal).
    thousandsSeparator: '.',
  },

  units: {
    // "u" in compact duur-labels ("1 u 10 min"), "uur" als losse eenheid.
    hourShort: 'u',
    hourLong: 'uur',
    minuteShort: 'min',
    // Trainingen korter dan een minuut: "17 sec", niet "0:17 min".
    secondShort: 'sec',

    // SI- en afgeleide symbolen. Ze veranderen tussen NL en EN niet, en toch staan ze
    // hier: de kopregel van dit bestand zegt dat élke user-facing string hier staat, en
    // een uitzondering die alleen in het hoofd van de schrijver bestaat is drift. Ze
    // stonden verspreid over dertig plaatsen in tien bestanden, waaronder één functie
    // die 'min' hardcodeerde náást een sleutel uit deze tabel (GoalPill).
    meter: 'm',
    kilometer: 'km',
    watt: 'W',
    kcal: 'kcal',
    centimeter: 'cm',
    kilogram: 'kg',
    /** Split-eenheid. Altijd deze vorm: "500/m" leest als "500 per meter". */
    per500m: '/500m',

    /**
     * GESPROKEN eenheden, voor een screenreader. Bewust een eigen tabel naast de visuele
     * hierboven: die is compact omdat hij naast een getal op een badge moet passen, en die
     * compactheid leest hardop verkeerd — '/500m' wordt "slash 500 m" en 'W' wordt de letter.
     * Twee tabellen betekent dat de visuele vorm korter kan worden zonder de uitspraak te
     * breken, en omgekeerd.
     */
    spoken: {
      meter: 'meter',
      kilometer: 'kilometer',
      watt: 'watt',
      per500m: 'per 500 meter',
      /** "2 minuten 14" — de seconden krijgen geen eenheid, zoals een mens een tijd uitspreekt. */
      tijd: (min: number, sec: number) =>
        min === 0 ? `${sec} seconden` : `${min} ${min === 1 ? 'minuut' : 'minuten'} ${sec}`,
    },

    /** Kale meervoudsvorm, voor waar de eenheid los van het getal staat. */
    workouts: 'trainingen',
    /** Telbaar, dus met meervoudsregel: "1 training" / "5 trainingen". */
    workoutCount: (n: number) => `${n} ${n === 1 ? 'training' : 'trainingen'}`,
  },

  dates: {
    daysShort: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
    daysLong: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    monthsShort: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
    monthsLong: [
      'januari', 'februari', 'maart', 'april', 'mei', 'juni',
      'juli', 'augustus', 'september', 'oktober', 'november', 'december',
    ],
    /** Scheidt datum en tijd in de lange datumvorm: "maandag 1 sep 2026 • 18:30". */
    dateTimeSeparator: '•',
    today: 'Vandaag',
    yesterday: 'Gisteren',
  },

  tabs: {
    home: 'Home',
    training: 'Training',
    history: 'Historiek',
    profile: 'Profiel',
  },

  validation: {
    emailRequired: 'Vul je e-mailadres in',
    emailInvalid: 'Ongeldig e-mailadres',
    passwordRequired: 'Vul je wachtwoord in',
    passwordMinLength: (n: number) => `Minstens ${n} tekens`,
    confirmRequired: 'Bevestig je wachtwoord',
    confirmMismatch: 'Wachtwoorden komen niet overeen',
  },

  auth: {
    // Gedeeld over inloggen, registreren, wachtwoord vergeten en wachtwoord
    // instellen: het verzoek haalde de server niet. Apart van de `failed`-zinnen
    // hieronder, want die vragen impliciet om je gegevens na te kijken en dat is
    // bij een netwerkfout het verkeerde advies.
    offline: 'Geen verbinding. Controleer je internet en probeer het opnieuw.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'naam@voorbeeld.be',
    passwordLabel: 'Wachtwoord',
    confirmPasswordLabel: 'Bevestig wachtwoord',
    login: {
      subtitle: 'Log in om verder te gaan',
      forgotPassword: 'Wachtwoord vergeten?',
      button: 'Log in',
      noAccount: 'Nog geen account?',
      registerLink: 'Registreer',
      failed: 'Inloggen mislukt.',
    },
    register: {
      title: 'Account aanmaken',
      subtitle: 'Begin met roeien',
      button: 'Maak account',
      haveAccount: 'Al een account?',
      loginLink: 'Log in',
      failed: 'Registratie mislukt.',
      // Neutraal bij een reeds-bestaand adres (user enumeration, security-audit P2-7).
      failedNeutral: 'Registratie mislukt. Log in als je al een account hebt, of probeer opnieuw.',
    },
    forgot: {
      title: 'Wachtwoord vergeten',
      subtitle: 'Vul je e-mailadres in en we sturen je een reset-link.',
      sentTitle: 'Check je mail',
      sentBody: (email: string) =>
        `We stuurden een reset-link naar ${email}. Volg de link om een nieuw wachtwoord in te stellen.`,
      backToLogin: 'Terug naar inloggen',
      button: 'Stuur reset-link',
      rememberAgain: 'Weet je het weer?',
      loginLink: 'Log in',
      failed: 'Kon geen reset-link versturen.',
    },
    reset: {
      title: 'Nieuw wachtwoord',
      subtitle: 'Kies een nieuw wachtwoord voor je account.',
      newPasswordLabel: 'Nieuw wachtwoord',
      button: 'Wachtwoord opslaan',
      doneTitle: 'Wachtwoord gewijzigd',
      doneBody: 'Je kunt nu inloggen met je nieuwe wachtwoord.',
      toLogin: 'Naar inloggen',
      invalidTitle: 'Link ongeldig of verlopen',
      invalidBody: 'Vraag een nieuwe reset-link aan om verder te gaan.',
      requestNewLink: 'Nieuwe link aanvragen',
      failed: 'Kon het wachtwoord niet wijzigen. Vraag een nieuwe link aan.',
    },
  },

  home: {
    greetingMorning: 'Goedemorgen,',
    greetingAfternoon: 'Goedemiddag,',
    greetingEvening: 'Goedenavond,',
    nameFallback: 'roeier',
    startButton: 'Start',
    // Doel-sectie op Home: CTA wanneer er nog geen periodedoel is (audit F6 — Home had
    // geen tegenhanger van de "Geen doel ingesteld"-rij op Profiel).
    goalCtaTitle: 'Stel een doel in',
    goalCtaBody: 'Zet een week- of maanddoel en volg je voortgang.',
    prSectionTitle: 'Persoonlijke records',
    prMaxDistance: 'Maximale\nafstand',
    prBest2k: 'Beste tijd\n2000 m',
    recentTitle: 'Recente trainingen',
    allAction: 'alle',
    emptyTitle: 'Nog geen trainingen — tijd om te beginnen!',
  },

  workout: {
    notConnectedTitle: 'Niet verbonden',
    notConnectedBody: 'Verbind eerst de roeitrainer via de knop bovenaan.',
    // Alleen wanneer de rit NERGENS staat — niet op de server en niet op het toestel. Een rit
    // die netjes in de wachtrij staat is geen fout maar gewoon offline zijn, en die krijgt
    // geen melding. Vandaar ook de belofte in de tweede zin: hij is echt niet bewaard.
    // De vraag na een crash of een geforceerde afsluiting. Geen "herstellen": je roeit niet
    // verder, je rondt af wat er al stond. De afstand en duur staan in de tekst zodat je kunt
    // zien of het de rit is die je bedoelt.
    recoverTitle: 'Onderbroken training gevonden',
    recoverBody: (afstand: string, duur: string) =>
      `Er stond nog een training van ${afstand} in ${duur} open. Wil je die bewaren?`,
    recoverSave: 'Bewaren',
    recoverDiscard: 'Weggooien',
    saveFailedTitle: 'Training niet bewaard',
    saveFailedBody:
      'Je training kon niet opgeslagen worden, ook niet op dit toestel. Probeer het opnieuw — sluit de app niet af.',
    splitsListHeader: 'SPLITS',
    idle: {
      title: 'Nieuwe training',
      devicesLabel: 'TOESTELLEN',
      goalLabel: 'DOEL',
      freeTraining: 'Vrije training zonder vooraf bepaald doel.',
      startButton: 'Start training',
    },
    deviceModal: {
      titleRower: 'Kies roeitrainer',
      titleHr: 'Kies hartslagmeter',
      signalStrong: 'Sterk',
      signalGood: 'Goed',
      signalWeak: 'Zwak',
    },
    connection: {
      searching: 'Zoeken naar de roeitrainer…',
      connecting: 'Verbinden…',
      discovering: 'Services ontdekken…',
      reconnecting: 'Opnieuw verbinden…',
      disconnecting: 'Verbinding verbreken…',
      elapsed: (time: string) => `verstreken ${time}`,
      stopButton: 'Stop training',
    },
    active: {
      stopButton: 'Stop',
      goalPillLabel: 'DOEL',
      goalNone: 'Geen',
      goalUnitSplit: 'split',
      totalTime: 'Totale tijd',
      totalDistance: 'Totale afstand',
      remainingTime: 'Resterende tijd',
      remainingDistance: 'Resterende afstand',
      covered: 'Afgelegd',
      currentSplit: 'Huidige split /500m',
      currentPower: 'Huidige kracht',
      startRowing: 'Begin met roeien…',
      splitFaster: (sec: number) => `Je bent ${sec} ${sec === 1 ? 'seconde' : 'seconden'} sneller`,
      splitSlower: (sec: number) => `Je bent ${sec} ${sec === 1 ? 'seconde' : 'seconden'} trager`,
      splitOnTarget: 'Je zit op doeltempo',
      wattsMore: (w: number) => `Je levert ${w} W meer dan je doel`,
      wattsLess: (w: number) => `Je levert ${w} W minder dan je doel`,
      wattsOnTarget: 'Je zit op doelvermogen',
      kpiSplit: 'Split /500m',
      kpiWatt: 'Watt',
      kpiSpm: 'SPM',
      kpiBpm: 'BPM',
      // De BPM-rij is de enige tikbare KPI-rij en zag er tot 2026-09-14 uit als alle andere
      // (UX-audit 2026-07-16, F15). Deze tekst staat op de waardeplek in plaats van "—", en
      // alleen zolang tikken werkelijk een scan start.
      kpiBpmVerbind: 'Verbind',
      kpiDistance: 'Totale afstand',
      kpiTime: 'Tijd',
      kpiKcal: 'Totale kcal',
    },
    summary: {
      title: 'Samenvatting',
      todayAt: (time: string) => `Vandaag - ${time}`,
      kpiDistance: 'AFSTAND',
      kpiDuration: 'DUUR',
      kpiEnergy: 'ENERGIE',
      kpiStrokes: 'SLAGEN',
      statSplit: 'Split /500m',
      statWatt: 'WATT',
      statSpm: 'SPM',
      statBpm: 'BPM',
      // Het sterretje staat achter kcal zodra er geen profielgewicht is; zonder deze regel
      // legt niets in de app uit wat het betekent (UX-audit 2026-07-16, F19).
      kcalSchatting: '* Schatting op een standaardgewicht. Vul je gewicht in bij je profiel.',
    },
    celebration: {
      title: 'Doel bereikt!',
      // Niet "Ga verder": de rit is op dit punt al beëindigd en opgeslagen, en die
      // knop suggereerde dat je nog kon doorroeien. Doorroeien ná het doel is een
      // bewuste productkeuze die niet bestaat (2026-08-07).
      viewSummary: 'Bekijk samenvatting',
      duration: (min: number) =>
        `Je hebt ${min} ${min === 1 ? 'minuut' : 'minuten'} geroeid. Geweldig gedaan! 💪`,
      distance: (value: string, unit: string) =>
        `Je hebt ${value} ${unit} geroeid. Geweldig gedaan! 💪`,
      // `split` en `watts` stonden hier ook. Sinds F3 beëindigt een tempo- of vermogensdoel de
      // rit niet meer — het zijn intensiteiten, geen eindpunten — dus er is geen moment meer
      // waarop die zinnen verschijnen. Het zone-model krijgt zijn eigen copy.
    },
  },

  // Persoonlijke records. Gedeeld door de samenvatting, de archieflijst en het
  // detailscherm — één vocabularium, zodat "Vermogen" overal hetzelfde heet.
  pr: {
    badge: 'PR',
    metric: {
      distance: 'Afstand',
      best2k: '2000 m',
      watts: 'Vermogen',
      split: 'Split',
    },
    bannerTitleOne: 'Nieuw persoonlijk record',
    bannerTitleMany: (n: number) => `${n} nieuwe persoonlijke records`,
    /** "vorige beste 142 W · 20 aug" */
    previous: (value: string, date: string) => `vorige beste ${value} · ${date}`,
    /** Record zonder bekende voorganger — komt voor bij trainingen van vóór pr_metrics. */
    previousUnknown: 'vorige waarde onbekend',
    /** Rij-badge wanneer één badge meerdere records moet dragen. */
    count: (n: number) => `${n} ${n === 1 ? 'record' : 'records'}`,
    /** Screenreader-tekst op een archiefrij. */
    a11yRow: (metrics: string) => `Persoonlijk record: ${metrics}`,
    /** Idem, voor een record waarvan de metric niet meer te achterhalen is. */
    a11yPlain: 'Persoonlijk record',
  },

  history: {
    title: 'Historiek',
    filterWeek: 'Deze week',
    filterMonth: 'Deze maand',
    filterYear: 'Dit jaar',
    filterAll: 'Alle',
    emptyTitle: 'Geen trainingen in deze periode.',
  },

  detail: {
    tabOverview: 'Overzicht',
    tabSplits: 'Splits',
    tabHeartRate: 'Hartslag',
    backLink: 'HISTORIEK',
    notFound: 'Training niet gevonden',
    colAvg: 'GEM',
    colPeak: 'PIEK',
    colBest: 'BEST',
    colSplit: 'SPLIT',
    colWatt: 'WATT',
    statWatt: 'WATT',
    statSpm: 'SPM',
    statBpm: 'BPM',
    deleteButton: 'Training verwijderen',
    deleteConfirmTitle: 'Training verwijderen',
    deleteConfirmBody: 'Ben je zeker dat je deze training wil verwijderen? Dit kan niet ongedaan gemaakt worden.',
    delete: 'Verwijderen',
    deleteFailed: 'Verwijderen mislukt. Probeer het opnieuw.',
    emptySplits: 'Geen splits beschikbaar.',
    emptyHeartRate: 'Geen hartslag-detail per segment. Beschikbaar vanaf je volgende training.',
  },

  // Meerregelige KPI-tegel-labels (gedeeld door historiek + detail + summary).
  kpi: {
    totalDuration: 'TOTALE\nDUUR',
    totalDistance: 'TOTALE\nAFSTAND',
    totalEnergy: 'TOTALE\nENERGIE',
    totalWorkouts: 'AANTAL\nTRAININGEN',
    totalStrokes: 'TOTALE\nSLAGEN',
    avgSplit: 'GEMIDDELDE\nSPLIT',
    fastestSplit: 'SNELSTE\nSPLIT',
    bpmAvg: 'GEMIDDELDE\nBPM',
    bpmMax: 'MAXIMALE\nBPM',
  },

  profile: {
    title: 'Profiel',
    noGoal: 'Geen doel ingesteld',
    sectionAccount: 'ACCOUNT',
    sectionBody: 'LICHAAMSGEGEVENS',
    sectionRower: 'ROEITRAINER',
    firstName: 'Voornaam',
    firstNamePlaceholder: 'Je voornaam',
    email: 'E-mail',
    gender: 'Geslacht',
    genderMale: 'Man',
    genderFemale: 'Vrouw',
    genderOther: 'Anders',
    birthDate: 'Geboortedatum',
    height: 'Lengte',
    weight: 'Gewicht',
    spmHalved: 'SPM halveren',
    spmHalvedHint: 'Voor trainers die de slagfrequentie dubbel tellen',
    logout: 'Uitloggen',
    logoutConfirmBody: 'Ben je zeker dat je wil uitloggen?',
    /**
     * Uitloggen wist de lokale wachtrij, dus een rit die nog niet verstuurd is, gaat eraan.
     * De app probeert eerst af te druinen; lukt dat niet (offline), dan hoort de gebruiker
     * te wéten wat hij weggooit in plaats van het achteraf te ontdekken. Blokkeren doen we
     * niet — het is zijn toestel en zijn sessie.
     */
    logoutPendingBody: (n: number) =>
      n === 1
        ? 'Er wacht nog 1 training op synchronisatie. Die gaat verloren als je nu uitlogt.'
        : `Er wachten nog ${n} trainingen op synchronisatie. Die gaan verloren als je nu uitlogt.`,
    emailSheet: {
      title: 'E-mail wijzigen',
      currentEmail: 'HUIDIG E-MAILADRES',
      newEmail: 'NIEUW E-MAILADRES',
      repeatEmail: 'HERHAAL E-MAILADRES',
      password: 'WACHTWOORD',
      emailPlaceholder: 'nieuw@email.com',
      passwordPlaceholder: 'Je huidige wachtwoord',
      wrongPassword: 'Wachtwoord klopt niet.',
      confirmationSentTitle: 'Bevestiging verstuurd',
      confirmationSentBody: (email: string) =>
        `Controleer je inbox op ${email} om de wijziging te bevestigen.`,
    },
    deleteAccount: 'Account verwijderen',
    deleteSheet: {
      title: 'Account verwijderen',
      warning:
        'Je account en alles wat erbij hoort verdwijnt: al je trainingen met hun splits en ' +
        'hartslaggegevens, je lichaamsgegevens en je doel. Dit kan niet ongedaan gemaakt worden.',
      password: 'WACHTWOORD',
      passwordPlaceholder: 'Je wachtwoord',
      confirm: 'Definitief verwijderen',
      wrongPassword: 'Wachtwoord klopt niet.',
      notSignedIn: 'Je sessie is verlopen. Log opnieuw in en probeer het daarna nog eens.',
      unavailable: 'Verwijderen lukt nu niet. Controleer je verbinding en probeer opnieuw.',
      rateLimited: 'Te veel pogingen. Wacht even en probeer opnieuw.',
      // Verzoek vertrok, antwoord kwam niet aan: we weten niet of het gelukt is.
      // Doen alsof er niets gebeurd is zou onterecht geruststellen.
      uncertain:
        'De verbinding viel weg tijdens het verwijderen. Probeer opnieuw — kun je straks niet ' +
        'meer inloggen, dan is je account wél verwijderd.',
      failed: 'Verwijderen is mislukt. Probeer het later opnieuw.',
    },
  },

  goals: {
    // Workout-doel segmenten (GoalSegments): label + accessibility-label per waarde.
    segmentNone: 'Geen',
    segmentDuration: 'Duur',
    segmentDistance: 'Afstand',
    segmentSplit: 'Split',
    segmentWatts: 'Watt',
    segmentNoneA11y: 'Geen doel',
    segmentDurationA11y: 'Duur, doel',
    segmentDistanceA11y: 'Afstand, doel',
    segmentSplitA11y: 'Split, doel',
    segmentWattsA11y: 'Watt, doel',
    // Doeltype-config (workout-goals.ts)
    // GoalSetupModal (mid-workout)
    // Periode-doel (GoalSheet)
    sheetTitle: 'Doel bewerken',
    sheetPeriodLabel: 'PERIODE',
    sheetTypeLabel: 'TYPE',
    sheetTargetLabel: 'STREEFWAARDE',
    sheetRemoveButton: 'Doel verwijderen',
    periodWeek: 'Week',
    periodMonth: 'Maand',
    metricDistance: 'Afstand',
    metricDuration: 'Duur',
    metricWorkouts: 'Trainingen',
    // GoalProgressCard
    thisWeek: 'Deze week',
    thisMonth: 'Deze maand',
    of: 'van',
    done: 'voldaan',
    editAction: 'wijzig',
    remaining: (formatted: string) => `${formatted} resterend`,
    remainingWorkouts: (n: number) => `${n} ${n === 1 ? 'training' : 'trainingen'} resterend`,
  },

  devices: {
    rower: 'Roeitrainer',
    rowerConnected: 'Verbonden',
    heartRateMonitor: 'Hartslagmeter',
    hrConnected: 'HR verbonden',
    connect: 'Verbinden',
    connecting: 'Verbinden…',
    disconnect: 'Verbreken',
    searching: 'Zoeken…',
    retry: 'Opnieuw',
  },

  states: {
    errorTitle: 'Kon niet laden',
    errorSubtitle: 'Controleer je verbinding en probeer opnieuw.',
  },

  a11y: {
    showPassword: 'Toon wachtwoord',
    hidePassword: 'Verberg wachtwoord',
    // Icon-only chevron-back op het workout-detailscherm. Bewust niet t.detail.backLink
    // ('OVERZICHT'): dat is de naam van de bestemming, geen actiebeschrijving.
    back: 'Terug',
  },

  consent: {
    title: 'Je gezondheidsgegevens',
    intro:
      'RowTrack kan gegevens verwerken die onder de privacywetgeving als gezondheidsgegevens ' +
      'gelden. Daar vragen we je apart toestemming voor — niet verstopt in de voorwaarden.',
    items: [
      'Je hartslag tijdens een training, ongeveer één meting per seconde',
      'Je gewicht en lengte',
      'Je geboortedatum en geslacht',
    ],
    why:
      'We gebruiken ze om je calorieverbruik te berekenen en om je trainingen in context te ' +
      'zetten. Ze worden nooit gedeeld, verkocht of gebruikt voor advertenties.',
    optional:
      'Zeg je nee, dan werkt de app gewoon. Je trainingen worden opgeslagen met afstand, tijd, ' +
      'vermogen en split; alleen je hartslag en lichaamsgegevens blijven weg.',
    withdraw:
      'Je kunt je keuze later altijd wijzigen in je profiel. Trek je de toestemming in, dan ' +
      'wissen we de hartslag- en lichaamsgegevens die er al zijn.',
    readPolicy: 'Lees het privacybeleid',
    accept: 'Ja, ik geef toestemming',
    decline: 'Nee, zonder deze gegevens',
    saveFailed: 'Je keuze kon niet opgeslagen worden. Controleer je verbinding en probeer opnieuw.',
    // Profiel-schakelaar.
    // `settingSection` is de KOP van de sectie, `settingLabel` het label van de rij erin.
    // Tot 2026-09-19 droegen die twee dezelfde sleutel, dus stond 'Gezondheidsgegevens'
    // letterlijk boven 'Gezondheidsgegevens' — de kop zei wat er direct onder stond en de
    // sectiestructuur was daardoor niet leesbaar. De kop noemt nu de groep, de rij de instelling.
    settingSection: 'Privacy',
    settingLabel: 'Gezondheidsgegevens',
    settingHint: 'Hartslag, gewicht, lengte, geboortedatum en geslacht',
    revokeTitle: 'Toestemming intrekken',
    revokeBody:
      'Je hartslag wordt uit al je opgeslagen trainingen gewist, samen met je gewicht, lengte, ' +
      'geboortedatum en geslacht. Je trainingen zelf blijven bestaan. Dit kan niet ongedaan gemaakt worden.',
    revokeConfirm: 'Intrekken en wissen',
    revokeFailed: 'Intrekken is mislukt. Probeer het opnieuw.',
    // Waar de gegevens geblokkeerd zijn
    hrBlocked: 'Geef eerst toestemming voor gezondheidsgegevens in je profiel.',
  },

  errors: {
    // BLE-fouten. De services emitteren codes (lib/ble/types.ts); de vertaling
    // gebeurt aan de UI-kant (i18n/bleErrors.ts).
    rower: {
      bluetoothOff: 'Bluetooth staat uit. Schakel Bluetooth in.',
      bluetoothUnauthorized: 'Bluetooth-toestemming is vereist. Sta Bluetooth toe in Instellingen.',
      permissionDenied: 'Bluetooth toestemming geweigerd.',
      rowerNotFound: 'Geen roeitrainer gevonden. Controleer of de roeitrainer aanstaat.',
      scanError: (detail: string) => `Scanfout: ${detail}`,
      scanFailed: 'Zoeken naar de roeitrainer is mislukt.',
      connectFailed: 'Verbinden met de roeitrainer is mislukt.',
      noData: 'Kan geen data ontvangen. Herstart de app.',
      connectionLost: 'Verbinding verloren. Probeer het opnieuw.',
    },
    hr: {
      bluetoothOff: 'Bluetooth staat uit. Schakel Bluetooth in.',
      permissionDenied: 'Bluetooth toestemming geweigerd.',
      // Noemt de twee dingen die de gebruiker zélf kan doen. Een borstband gaat uit
      // zonder huidcontact; een horloge moet zijn hartslag-broadcast aan hebben staan.
      hrNotFound:
        'Geen hartslagmeter gevonden. Zit de band goed, of staat de hartslag-broadcast ' +
        'op je horloge aan?',
      scanError: (detail: string) => `Scanfout: ${detail}`,
      scanFailed: 'Zoeken naar een hartslagmeter is mislukt.',
      connectFailed: 'Verbinden met de hartslagmeter is mislukt.',
      connectionLost: 'Verbinding met de hartslagmeter verloren.',
      // Verbonden zijn en meten zijn twee verschillende dingen. Noem daarom de twee
      // oorzaken die de gebruiker zélf kan wegnemen, net als bij `hrNotFound`.
      noData:
        'Je hartslagmeter is verbonden maar stuurt geen hartslag. Draag je hem, en '
        + 'staat de hartslag-broadcast aan?',
    },
  },
};
