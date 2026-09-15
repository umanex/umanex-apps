// Pure poort voor de Check-runner: commandotekst in, een reden of `null` uit. Geen fs,
// geen shell — zodat `scripts/guards-selftest.mjs` hem zonder testrunner kan draaien.
// Zelfde opzet als `lib/guardRules.mjs`.
//
// ── Waarom hier een poort staat ─────────────────────────────────────────────────────
// De cockpit kan het commando uit de `- **Check:**`-regel van een lus-entry draaien. Dat
// is shell uitvoeren op basis van tekst uit een markdownbestand, en die tekst is jaren
// geleden geschreven met een heel ander doel dan "dit wordt straks door een knop
// aangeroepen". De poort is geen bescherming tegen een aanvaller — dit draait lokaal,
// achter een loopback-sluis, op tekst die Jeroen zelf schreef — maar tegen een oud item
// waarin per ongeluk iets staat dat de toestand verandert.
//
// ── Waarom een allowlist de dragende helft is ───────────────────────────────────────
// `CLAUDE.md`: *alléén bevestigen kan een zwarte lijst voor een positieve regel*. Een
// denylist kan alleen weren wat je al bedacht hebt. De allowlist keert dat om: alleen
// commando's waarvan we weten dát ze lezen mogen draaien, en al het andere wordt
// geweigerd met een reden die op het scherm komt. De denylist staat er als tweede laag,
// voor gevallen waar een toegestaan commando alsnog schrijft (`git push`, `curl -X POST`).
//
// ── En waarom élk segment getoetst wordt ────────────────────────────────────────────
// Een check is vaak een pijplijn: `grep -c X bestand | wc -l`. Alleen het eerste woord
// toetsen laat `grep x | rm -rf y` door. De poort splitst daarom op `|`, `&&`, `||` en
// `;` en eist dat élk segment met een toegestaan commando begint.

/**
 * Commando's die mogen draaien. Allemaal lezend, allemaal zonder neveneffect op de repo.
 * `bash`, `sh` en `zsh` staan er bewust NIET in: die maken de hele poort betekenisloos.
 */
export const TOEGESTAAN = [
  'grep', 'egrep', 'fgrep', 'rg', 'awk', 'sed', 'cut', 'sort', 'uniq', 'wc', 'head', 'tail',
  'cat', 'ls', 'find', 'stat', 'file', 'diff', 'cmp', 'test', '[', 'echo', 'printf', 'tr',
  'basename', 'dirname', 'node', 'jq', 'git', 'gh', 'pnpm', 'npm', 'npx', 'curl', 'true', 'xargs',
];

/**
 * Patronen die ook binnen een toegestaan commando niet mogen. Tweede laag, geen eerste:
 * wat hier niet staat wordt al door de allowlist geweerd.
 */
const VERBODEN = [
  { re: /\brm\s+-[rf]/i, reden: 'verwijdert bestanden' },
  { re: /\bgit\s+(push|reset|clean|checkout|switch|restore|stash|rebase|merge|commit|rm|mv)\b/i,
    reden: 'verandert de git-toestand' },
  { re: /\bgh\s+(pr|issue|release|repo|api)\s+(create|edit|close|merge|delete|--method\s+(POST|PUT|PATCH|DELETE))/i,
    reden: 'schrijft naar GitHub' },
  { re: /\bcurl\b[^|;&]*\s(-X|--request)\s*(POST|PUT|PATCH|DELETE)/i, reden: 'doet een schrijvende HTTP-call' },
  { re: /\bcurl\b[^|;&]*\s(-d|--data|-F|--form|-T|--upload-file)\b/i, reden: 'stuurt data mee in een HTTP-call' },
  { re: /\b(pnpm|npm|npx)\s+(add|install|i|remove|rm|uninstall|publish|update|up)\b/i,
    reden: 'wijzigt dependencies' },
  { re: /\b(pnpm|npm)\s+(run\s+)?(build|pm2:\w+|deploy|start)\b/i, reden: 'bouwt of deployt' },
  { re: /\bpm2\b/i, reden: 'raakt draaiende productieprocessen' },
  { re: /\b(supabase|psql|sqlite3|mysql)\b/i, reden: 'praat met een database' },
  { re: /\bdrop\s+(table|database)\b/i, reden: 'is een destructieve query' },
  { re: /\b(sudo|chmod|chown|kill|killall|pkill|launchctl|defaults)\b/i, reden: 'raakt het systeem' },
  { re: /\bmv\b|\bcp\b|\btee\b|\btouch\b|\bmkdir\b/i, reden: 'schrijft naar de schijf' },
  { re: />{1,2}(?!\s*\/dev\/null)/, reden: 'leidt uitvoer naar een bestand' },
  { re: /\$\(|`/, reden: 'bevat commando-substitutie, en die valt buiten de poort' },
  { re: /\bnode\s+[^-]/i, reden: 'draait een scriptbestand, en wat daarin staat kan deze poort niet lezen' },
];

/**
 * Splitst een commando op shell-operatoren, maar niet binnen aanhalingstekens.
 *
 * Een naïeve `split(/\|/)` snijdt dwars door `grep -E 'a|b'` en door een URL met een pad,
 * en levert dan brokstukken op die als commandonaam worden gelezen. Gemeten 2026-09-15
 * over 144 echte checks: dat gaf weigeringen op "pathname", "Overlay", "/resultaten" en
 * "card" — stuk voor stuk stukjes tekst uit het midden van een geldig commando. Een poort
 * die om de verkeerde reden weigert, leert je hem te omzeilen.
 *
 * @returns {{segmenten: string[], buitenQuotes: string}|{fout: string}}
 */
export function ontleed(cmd) {
  const segmenten = [];
  let huidig = '';
  let buiten = '';
  let quote = null;

  for (let i = 0; i < cmd.length; i += 1) {
    const c = cmd[i];

    if (quote !== null) {
      huidig += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      huidig += c;
      continue;
    }
    if (c === '\\' && i + 1 < cmd.length) {
      huidig += c + cmd[i + 1];
      buiten += ' ';
      i += 1;
      continue;
    }
    if (c === '|' || c === '&' || c === ';' || c === '\n') {
      if ((c === '|' && cmd[i + 1] === '|') || (c === '&' && cmd[i + 1] === '&')) i += 1;
      segmenten.push(huidig);
      huidig = '';
      buiten += ' ';
      continue;
    }
    huidig += c;
    buiten += c;
  }

  if (quote !== null) return { fout: `geen sluitend ${quote === "'" ? 'enkel' : 'dubbel'} aanhalingsteken` };
  segmenten.push(huidig);

  return {
    segmenten: segmenten.map((s) => s.trim()).filter((s) => s !== ''),
    buitenQuotes: buiten,
  };
}

/**
 * Mag dit commando draaien?
 *
 * @returns {string|null} de reden van weigering, of `null` wanneer het mag.
 */
export function weigering(commando) {
  if (typeof commando !== 'string') return 'geen commando';
  const cmd = commando.trim();
  if (cmd === '') return 'leeg commando';
  if (cmd.length > 500) return 'commando is langer dan 500 tekens';

  const ontleding = ontleed(cmd);
  if ('fout' in ontleding) return `geweigerd — ${ontleding.fout}`;
  const { segmenten, buitenQuotes } = ontleding;

  // De denylist loopt over de tekst búiten aanhalingstekens. Een `>` of het woord `rm`
  // binnen een quote is data, geen redirect en geen commando — `grep -c '>' bestand` hoort
  // niet geweigerd te worden omdat er een groter-dan-teken in zijn zoekterm staat.
  for (const { re, reden } of VERBODEN) {
    if (re.test(buitenQuotes)) return `geweigerd — ${reden}`;
  }

  if (segmenten.length === 0) return 'geen uitvoerbaar segment';

  for (const seg of segmenten) {
    // Een leidende variabele-toewijzing (`FOO=bar grep …`) hoort bij het commando erachter.
    const woorden = seg.split(/\s+/).filter((w) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(w));
    const eerste = woorden[0] ?? '';
    if (eerste === '') return `geweigerd — segment zonder commando: "${seg}"`;
    if (!TOEGESTAAN.includes(eerste)) {
      return `geweigerd — "${eerste}" staat niet op de lijst van lezende commando's`;
    }
  }

  return null;
}

/**
 * Zoekt het Check-commando van één entry op in een gemeten werkvoorraad.
 *
 * De request noemt alleen bestand en datum; wát er draait komt uit de meting. Dat is
 * ontwerpprincipe 5 uit `de-stand.md` — *nooit shell, nooit een pad of commando uit de
 * request* — en het is de reden dat een verzonnen request hier niets kan bereiken.
 */
export function zoekCheck(rijen, bestand, datum) {
  if (!Array.isArray(rijen)) return { fout: 'geen werkvoorraad gemeten' };
  const treffers = rijen.filter((r) => r?.bestand === bestand && r?.datum === datum);
  if (treffers.length === 0) return { fout: 'geen entry met dat bestand en die datum in de meting' };
  // Twee entries op dezelfde dag in hetzelfde bestand kunnen bestaan. Dan is de vraag
  // welke bedoeld werd niet te beantwoorden, en gokken is erger dan weigeren.
  if (treffers.length > 1) {
    return { fout: `${treffers.length} entries delen bestand en datum — niet te onderscheiden` };
  }
  const check = treffers[0].check ?? '';
  if (check === '') return { fout: 'deze entry draagt geen uitvoerbaar Check-commando' };
  return { commando: check };
}
