// Dutch translation table — the single source for every user-facing string.
// Values are plain strings; parametrized messages are functions so plural rules
// and word order stay inside the locale file (an English en.ts implements the
// same shape with its own logic; `Translations` in ../types.ts enforces that).
// Do NOT mark this `as const`: the widened types ARE the contract for en.ts.
export const nl = {
  common: {
    save: 'Opslaan',
    cancel: 'Annuleren',
    close: 'Sluiten',
    retry: 'Opnieuw proberen',
    continue: 'Ga verder',
    error: 'Fout',
    saveFailed: (detail: string) => `Opslaan mislukt: ${detail}`,
  },

  format: {
    decimalSeparator: ',',
  },

  units: {
    // "u" in compact duur-labels ("1 u 10 min"), "uur" als losse eenheid.
    hourShort: 'u',
    hourLong: 'uur',
    minuteShort: 'min',
    sessions: 'sessies',
  },

  dates: {
    daysShort: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
    daysLong: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    monthsShort: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
    monthsLong: [
      'januari', 'februari', 'maart', 'april', 'mei', 'juni',
      'juli', 'augustus', 'september', 'oktober', 'november', 'december',
    ],
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
    prSectionTitle: 'Persoonlijke records',
    prMaxDistance: 'Maximale\nafstand',
    prBest2k: 'Beste tijd\n2000m',
    recentTitle: 'Recente trainingen',
    allAction: 'alle',
    emptyTitle: 'Nog geen workouts — tijd om te beginnen!',
  },

  workout: {
    notConnectedTitle: 'Niet verbonden',
    notConnectedBody: 'Verbind eerst de roeitrainer via de knop bovenaan.',
    splitsListHeader: 'SPLITS',
    idle: {
      title: 'Nieuwe training',
      devicesLabel: 'TOESTELLEN',
      goalLabel: 'DOEL',
      freeTraining: 'Vrije training zonder vooraf bepaald doel.',
      startButton: 'Start training',
    },
    hrModal: {
      title: 'Kies hartslagmeter',
      cancel: 'Annuleer',
      signalStrong: 'Sterk',
      signalGood: 'Goed',
      signalWeak: 'Zwak',
    },
    connection: {
      searching: 'Zoeken naar roeier...',
      connecting: 'Verbinden...',
      discovering: 'Services ontdekken...',
      reconnecting: 'Opnieuw verbinden...',
      disconnecting: 'Verbinding verbreken...',
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
      currentSplit: 'Huidige split 500/m',
      currentPower: 'Huidige kracht',
      startRowing: 'Begin met roeien...',
      splitFaster: (sec: number) => `Je bent ${sec} seconden sneller`,
      splitSlower: (sec: number) => `Je bent ${sec} seconden trager`,
      wattsMore: (w: number) => `Je levert ${w} W meer`,
      wattsLess: (w: number) => `Je levert ${w} W minder dan je doel`,
      kpiSplit: 'Split 500/m',
      kpiWatt: 'Watt',
      kpiSpm: 'SPM',
      kpiBpm: 'BPM',
      kpiDistance: 'Totaal afstand',
      kpiTime: 'Tijd',
      kpiKcal: 'Totaal Kcal',
    },
    summary: {
      title: 'Samenvatting',
      todayAt: (time: string) => `Vandaag - ${time}`,
      prBanner: 'Nieuw persoonlijk record. Proficiat!',
      kpiDistance: 'AFSTAND',
      kpiDuration: 'DUUR',
      kpiEnergy: 'ENERGIE',
      kpiStrokes: 'SLAGEN',
      statSplit: 'SPLIT /500M',
      statWatt: 'WATT',
      statSpm: 'SPM',
      statBpm: 'BPM',
    },
    celebration: {
      title: 'Doel bereikt!',
      duration: (min: number) =>
        `Je hebt ${min} ${min === 1 ? 'minuut' : 'minuten'} geroeid. Geweldig gedaan! 💪`,
      distance: (value: string, unit: string) =>
        `Je hebt ${value} ${unit} geroeid. Geweldig gedaan! 💪`,
      split: (split: string) =>
        `Je hebt je split-doel van ${split}/500m gehaald. Geweldig gedaan! 💪`,
      watts: (w: number) =>
        `Je hebt je doel van ${w} watt gehaald. Geweldig gedaan! 💪`,
    },
  },

  history: {
    title: 'Historiek',
    filterWeek: 'Week',
    filterMonth: 'Maand',
    filterYear: 'Jaar',
    filterAll: 'Alle',
    emptyTitle: 'Geen workouts in deze periode.',
  },

  detail: {
    tabOverview: 'Overzicht',
    tabSplits: 'Splits',
    tabHeartRate: 'Hartslag',
    backLink: 'OVERZICHT',
    prBadge: 'PR',
    notFound: 'Workout niet gevonden',
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
    deleteFailed: 'Verwijderen mislukt. Probeer opnieuw.',
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
    bpmAvg: 'BPM\nGEMIDDELD',
    bpmMax: 'BPM\nMAXIMAAL',
  },

  profile: {
    title: 'Profiel',
    noGoal: 'Geen doel ingesteld',
    sectionAccount: 'ACCOUNT',
    sectionBody: 'LICHAAMSGEGEVENS',
    sectionRower: 'ROEITRAINER',
    firstName: 'Voornaam',
    firstNamePlaceholder: 'Je voornaam',
    email: 'Email',
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
    logoutConfirmBody: 'Weet je zeker dat je wilt uitloggen?',
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
    typeDuration: 'Tijd',
    typeDistance: 'Afstand',
    typeSplit: 'Split',
    typeWatts: 'Watt',
    // GoalSetupModal (mid-workout)
    setupTitle: 'Stel doel in',
    setupButton: 'Stel in',
    setupNoGoalNote: 'Geen doel voor deze training.',
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
    metricWorkouts: 'Sessies',
    // GoalProgressCard
    thisWeek: 'Deze week',
    thisMonth: 'Deze maand',
    of: 'van',
    done: 'voldaan',
    editAction: 'wijzig',
    remaining: (formatted: string) => `${formatted} resterend`,
    remainingWorkouts: (n: number) => `${n} trainingen resterend`,
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
  },

  errors: {
    // Roeitrainer-BLE. De service emitteert codes (lib/ble/types.ts); de vertaling
    // gebeurt aan de UI-kant (i18n/bleErrors.ts). HR-fouten bereiken de UI niet
    // (alleen dev-log) en hebben daarom geen vertaling.
    rower: {
      bluetoothOff: 'Bluetooth staat uit. Schakel Bluetooth in.',
      bluetoothUnauthorized: 'Bluetooth toestemming is vereist.',
      permissionDenied: 'Bluetooth toestemming geweigerd.',
      rowerNotFound: 'Geen roeier gevonden. Controleer of de roeier aan staat.',
      scanError: (detail: string) => `Scanfout: ${detail}`,
      scanFailed: 'BLE scan mislukt',
      connectFailed: 'Verbinding mislukt',
      noData: 'Kan geen data ontvangen. Herstart de app.',
      connectionLost: 'Verbinding verloren. Probeer opnieuw.',
    },
  },
};
