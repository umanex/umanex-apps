/**
 * Wie mag de gedeelde BLE-scan gebruiken, en wanneer?
 *
 * `BleManager` uit react-native-ble-plx is een procesbrede singleton (`static
 * sharedInstance`): `RowerBleService` en `HRBleService` doen elk `new BleManager()` maar
 * krijgen hetzelfde object, met één native scan. Twee diensten die denken dat ze hun eigen
 * scanner hebben, delen er dus één.
 *
 * De eerste versie van deze module regelde alleen wie mocht *stoppen*. Dat was te weinig,
 * en op 2026-08-22 is gemeten waarom. De gebruiker tikte op Verbinden bij de hartslagmeter
 * en 0,45 s later bij de roeier:
 *
 *   12:35:57.543  [HR]  scan started (filter: service 0x180D)
 *   12:35:57.988  [BLE] scan started (filter: FTMS UUID)
 *   12:36:02.545  [HR]  niets in 5000 ms — doorzoeken
 *   (daarna 25 s lang géén enkel `found:`, tot een nieuwe scan om 12:36:23 binnen
 *    150 ms twee toestellen vond)
 *
 * Twee dingen gingen tegelijk mis. **App-side** nam de tweede `claimScan` het slot over
 * zonder de eerste iets te vertellen; die bailde daarna op elke eigenaarscheck en
 * publiceerde nooit meer een status — de rij bleef op 'Zoeken…' met een uitgeschakelde
 * knop, en autoconnect slaat 'hr' over zolang de status niet 'idle' of 'error' is. Alleen
 * een app-herstart of het stoppen van de rit (dat `stopHR()` aanroept) bracht herstel.
 * **Native** disposet MultiplatformBleAdapter de oude scan-subscription pás nadat de
 * nieuwe gestart is, en zijn dispose-closure doet `centralManager.stopScan()` — dat legt
 * de zojuist gestarte scan óók stil. Vandaar dat niet alleen de verliezer, maar ook de
 * winnaar 25 seconden lang niets vond.
 *
 * Notificeren van de verdrongen dienst zou alleen het eerste probleem oplossen. Daarom
 * serialiseert deze module: er is er altijd hooguit één aan de beurt, en een tweede
 * aanvraag wacht in plaats van te verdringen. De wachtende dienst staat toch al op
 * 'scanning', dus voor de gebruiker verandert er niets aan wat hij ziet — behalve dat het
 * werkt.
 */

type ScanJob = {
  token: symbol;
  start: (handle: number) => void;
  /** Aangeroepen wanneer het vangnet het slot afpakt terwijl deze job het nog had. */
  onPreempted?: () => void;
  /**
   * Aangeroepen wanneer `start` gooit terwijl deze job uit de wachtrij aan de beurt kwam.
   * Op dat moment is de try/catch van de aanvrager allang teruggekeerd, dus zonder deze
   * haak zou de fout een unhandled rejection worden — en zou de dienst op 'Zoeken…'
   * blijven staan zonder ooit iets te melden.
   */
  onStartError?: (error: unknown) => void;
  maxHoldMs: number;
};

/**
 * Vangnet. Elke dienst stopt zijn eigen scan ruim hierbinnen (roeier 15 s, hartslag
 * 5 + 10 s), dus dit vuurt alleen wanneer er iets écht misgaat — en dan is een scan die
 * te vroeg wordt losgelaten oneindig veel beter dan een wachtrij die nooit meer beweegt.
 */
const MAX_HOLD_MS = 25_000;

let owner: symbol | null = null;
let queue: ScanJob[] = [];
let holdGuard: ReturnType<typeof setTimeout> | null = null;

/**
 * Volgnummer per toekenning. Zonder dit laat een uitgestelde `releaseScan` — geplant op de
 * Promise van `stopDeviceScan()` — een tóekenning los die intussen opnieuw is uitgedeeld
 * aan dezelfde dienst. Gemeten: `stopScan()` en `requestScan()` staan in `startScan()` in
 * één synchroon blok, dus dat venster is geen theorie.
 */
let grantId = 0;

/**
 * Vraag de gedeelde scan aan. `start` draait zodra het slot vrij is: meteen wanneer er
 * niets loopt, en anders zodra de huidige eigenaar loslaat. Een tweede aanvraag met
 * dezelfde token vervangt de vorige — een dienst die opnieuw scant wil niet twee keer in
 * de rij staan.
 */
export function requestScan(
  token: symbol,
  start: (handle: number) => void,
  opts?: {
    maxHoldMs?: number;
    onPreempted?: () => void;
    onStartError?: (error: unknown) => void;
  },
): void {
  queue = queue.filter((job) => job.token !== token);
  const job: ScanJob = {
    token,
    start,
    onPreempted: opts?.onPreempted,
    onStartError: opts?.onStartError,
    maxHoldMs: opts?.maxHoldMs ?? MAX_HOLD_MS,
  };

  if (owner === null || owner === token) {
    // Synchroon aan de beurt: een fout gaat terug naar de aanroeper, die er zijn eigen
    // try/catch omheen heeft staan.
    grant(job, { rethrow: true });
    return;
  }
  queue.push(job);
}

function grant(job: ScanJob, opts?: { rethrow?: boolean }): void {
  owner = job.token;
  grantId += 1;
  const handle = grantId;
  clearHoldGuard();
  holdGuard = setTimeout(() => {
    holdGuard = null;
    // Het vangnet mag niet stil onteigenen — dát is precies het mechanisme dat deze module
    // moest wegnemen. De eigenaar hoort te weten dat hij zijn scan kwijt is, zodat hij een
    // eindstatus kan publiceren in plaats van op 'Zoeken…' te blijven staan.
    job.onPreempted?.();
    releaseScan(job.token, handle);
  }, job.maxHoldMs);

  try {
    job.start(handle);
  } catch (e) {
    // Een start die gooit mag het slot niet gijzelen: de volgende wachtende zou anders de
    // volle maxHold blijven staan zonder dat iemand ziet waarom.
    releaseScan(job.token, handle);
    if (opts?.rethrow) throw e;
    // Uit de wachtrij: doorgooien zou hier de release-keten van een ándere dienst breken
    // (die staat in een `.then()`), dus de fout gaat naar de eigenaar van de job.
    job.onStartError?.(e);
  }
}

export function ownsScan(token: symbol): boolean {
  return owner === token;
}

/** Staat deze token te wachten op zijn beurt? */
export function isQueuedForScan(token: symbol): boolean {
  return queue.some((job) => job.token === token);
}

/**
 * Geef het slot terug — of trek een aanvraag in die nog in de wachtrij stond. De volgende
 * wachtende start hier, dus roep dit pas aan nádat de eigen native scan gestopt is: doe je
 * het eerder, dan start de volgende scan terwijl de vorige nog aan het afbouwen is en legt
 * die hem alsnog stil.
 */
export function releaseScan(token: symbol, handle?: number): void {
  // Een aanvraag intrekken kan altijd — die heeft nog geen toekenning en dus geen handle.
  queue = queue.filter((job) => job.token !== token);
  if (owner !== token) return;

  // Met handle: alleen loslaten wat déze aanroeper gekregen heeft. Een late release uit een
  // vorige cyclus zou anders de scan van zijn eigen opvolger afbreken.
  if (handle !== undefined && handle !== grantId) return;

  owner = null;
  clearHoldGuard();
  const next = queue.shift();
  if (next) grant(next);
}

function clearHoldGuard(): void {
  if (holdGuard) {
    clearTimeout(holdGuard);
    holdGuard = null;
  }
}

/** Alleen voor tests: brengt de arbiter terug op zijn begintoestand. */
export function resetScanArbiter(): void {
  owner = null;
  queue = [];
  clearHoldGuard();
}
