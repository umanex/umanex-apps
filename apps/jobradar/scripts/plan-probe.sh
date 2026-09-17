#!/bin/bash
#
# Voert de bedrijfsplan-routes uit tegen een VERSE database — nooit tegen .data/jobradar.db.
#
# Wat de scenario-suite niet kan: de seed over HTTP zien draaien, een 409 lezen zoals de
# browser hem krijgt, en vaststellen dat een verzoek dat de logica weigert óók door de route
# geweigerd wordt. Die twee kanten lopen uiteen zodra iemand een controle in de route zet in
# plaats van in de laag eronder.
#
# Bouwt in .next-planprobe (via NEXT_DIST_DIR) en ruimt die map op, dus raakt .next van de
# dev-server niet. Poort 3118, database in de meegegeven map.
#
# Gebruik: pnpm --filter jobradar plan:probe <werkmap>
#
set -uo pipefail

APP="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SP="${1:-}"
if [ -z "$SP" ]; then
  echo "Geef een werkmap mee: pnpm --filter jobradar plan:probe /tmp/werkmap" >&2
  exit 2
fi
mkdir -p "$SP"
# Optioneel `--shot=<map>`: de UI-pass legt dan het gevulde plan vast (overzicht, Geblokkeerd
# open, het paneel na een afronding). Tot 2026-09-17 bestond daar geen instrument voor.
SHOTMAP=""
case "${2:-}" in
  --shot=*) SHOTMAP="${2#--shot=}"; mkdir -p "$SHOTMAP" ;;
esac
PORT=3118
DB="$SP/plan.db"
rm -f "$DB" "$DB-wal" "$DB-shm"

# Eén bedrijf, zodat een koppeling iets heeft om naar te wijzen. Géén plan-rijen: die moeten
# van de server komen, anders toetst dit script zijn eigen fixture in plaats van de seed.
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import "$APP/scripts/ts-resolve.mjs" --input-type=module -e "
import Database from 'better-sqlite3'
import { SCHEMA_DDL, pasKolomMigratiesToe } from '$APP/lib/db/ddl.ts'
const db = new Database('$DB'); db.exec(SCHEMA_DDL); pasKolomMigratiesToe(db)
db.prepare(\`INSERT INTO companies
 (id, external_id, source, company_name, postcode, region, dedupe_hash, lead_status, opt_out, rechtsgrond, first_seen_at, last_seen_at)
 VALUES (1,'a','test','Testbedrijf NV',8000,'WVL','h1','new',0,'gerechtvaardigd belang','x','x')\`).run()
db.close(); console.log('fixture klaar')
" 2>&1 | grep -v Warning

if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✗ Poort $PORT is bezet. Dit script mag geen draaiend proces overnemen — dan meet het" >&2
  echo "  een andere server en een andere database. Stop dat proces eerst." >&2
  exit 2
fi

# `next build` met een eigen NEXT_DIST_DIR herschrijft twee getrackte bestanden zodat ze naar
# díe build-map wijzen: `next-env.d.ts` en `tsconfig.json`. Dit script is een meetinstrument;
# een instrument dat de bron muteert waaruit je commit, legt die mutatie vast in je volgende
# commit. Gemeten 2026-09-16, twee keer in één sessie.
#
# Inhoud bewaren en terugzetten, niet `git checkout`: dat laatste zou een échte openstaande
# wijziging aan tsconfig.json weggooien.
BEWAARD=$(mktemp -d)
cp "$APP/next-env.d.ts" "$BEWAARD/next-env.d.ts" 2>/dev/null
cp "$APP/tsconfig.json" "$BEWAARD/tsconfig.json" 2>/dev/null
herstelBronbestanden() {
  [ -f "$BEWAARD/next-env.d.ts" ] && cp "$BEWAARD/next-env.d.ts" "$APP/next-env.d.ts"
  [ -f "$BEWAARD/tsconfig.json" ] && cp "$BEWAARD/tsconfig.json" "$APP/tsconfig.json"
  rm -rf "$BEWAARD"
}

export NEXT_DIST_DIR=.next-planprobe JOBRADAR_DB_PATH="$DB"
(cd "$APP" && npx next build >/dev/null 2>&1) || { echo "BUILD FAALT"; exit 1; }

(cd "$APP" && exec npx next start --port $PORT >/dev/null 2>&1) &
SRV=$!
opruimen() {
  kill "$SRV" 2>/dev/null
  for pid in $(lsof -t -nP -iTCP:$PORT -sTCP:LISTEN 2>/dev/null); do kill "$pid" 2>/dev/null; done
  wait "$SRV" 2>/dev/null
  rm -rf "$APP/.next-planprobe"
  herstelBronbestanden
}
trap opruimen EXIT

for i in $(seq 1 40); do curl -sf "http://127.0.0.1:$PORT/api/plan" >/dev/null 2>&1 && break; sleep 1; done

B="http://127.0.0.1:$PORT"

# Elk geval wordt vergeleken, niet afgedrukt. De vorige versie deed uitsluitend `printf` en
# eindigde onvoorwaardelijk op exit 0: een route die 500 gaat geven of een 409 die stil een 200
# wordt, verschijnt dan netjes in de kolom en het script zegt daarna PROBE KLAAR. Dat is de
# faalklasse uit CLAUDE.md — een instrument dat een lijst print en exit 0 geeft — en zeven
# acceptatie-items hingen eraan.
GEZAKT=0
v() { # v <label> <verwacht> <gemeten> [context]
  if [ "$2" = "$3" ]; then
    printf '  ✓ %-52s %s\n' "$1" "${4:-$3}"
  else
    printf '  ✗ %-52s verwacht %s, kreeg %s  %s\n' "$1" "$2" "$3" "${4:-}"
    GEZAKT=$((GEZAKT + 1))
  fi
}
# Voor een waarde waar alleen "bevat" zinnig is (een foutmelding, een substring).
vbevat() { # vbevat <label> <patroon> <gemeten>
  case "$3" in
    *"$2"*) printf '  ✓ %-52s %s\n' "$1" "$3" ;;
    *) printf '  ✗ %-52s verwacht iets met "%s", kreeg %s\n' "$1" "$2" "$3"; GEZAKT=$((GEZAKT + 1)) ;;
  esac
}
p() { printf '%-54s %s\n' "$1" "$2"; }
tel() { sqlite3 "$DB" "$1"; }
q() { node -e "const d=require('fs').readFileSync('/tmp/planbody','utf8');try{const j=JSON.parse(d);const v=process.argv[1].split('.').reduce((a,k)=>a?.[k],j);console.log(typeof v==='object'?JSON.stringify(v):v)}catch{console.log(d.slice(0,70))}" "$1"; }
patch() { curl -s -o /tmp/planbody -w '%{http_code}' -X PATCH "$B/api/plan/acties/$1" -H 'content-type: application/json' -d "$2"; }
versie() { tel "SELECT versie FROM plan_actions WHERE key='$1';"; }

# POSITIEVE CONTROLE. Een verse database heeft nul plan-rijen tot de server hem zaait, en nul
# geschiedenis. Staat er al iets, dan praat dit script met een andere server of een ander
# bestand, en is elke uitkomst hieronder een uitspraak over het verkeerde ding.
acties=$(tel 'SELECT count(*) FROM plan_actions;')
hist=$(tel 'SELECT count(*) FROM plan_history;')
if [ "$acties" != "22" ] || [ "$hist" != "0" ]; then
  echo "✗ Verwacht 22 acties en 0 geschiedenisregels na de eerste GET; kreeg $acties en $hist." >&2
  exit 2
fi
echo "0. positieve controle: 22 gezaaide acties, 0 geschiedenis          ok"

curl -s "$B/api/plan" >/dev/null
v "1. tweede GET zaait niet opnieuw" "22" "$(tel 'SELECT count(*) FROM plan_actions;')" "acties"
v "   A18 staat uitgesteld" "uitgesteld" "$(tel "SELECT status FROM plan_actions WHERE key='A18';")"
vbevat "   met een aanleiding" "Oppakken" "$(tel "SELECT substr(wachtreden,1,24) FROM plan_actions WHERE key='A18';")"
v "   inzet start op onbekend" "22" "$(tel 'SELECT count(*) FROM plan_actions WHERE inschatting_uren IS NULL;')" "van 22 NULL"

v "2. A01 op bezig" "200" "$(patch A01 '{"status":"bezig","versie":1}')"
v "   versie opgehoogd" "2" "$(versie A01)"
v "3. dezelfde versie opnieuw" "409" "$(patch A01 '{"status":"gereed","versie":1,"bewijs":"x"}')"
v "   en het conflict is een versieconflict" "versie" "$(q conflict)"
v "4. A02 starten met open blokkade" "409" "$(patch A02 '{"status":"bezig","versie":1}')"
v "   en het conflict is een afhankelijkheid" "afhankelijkheid" "$(q conflict)"
v "5. A02 met vastgelegde uitzondering" "200" "$(patch A02 '{"status":"bezig","versie":1,"startUitzondering":"A01 is inhoudelijk rond"}')"
v "   en de uitzondering is gelogd" "1" "$(tel "SELECT count(*) FROM plan_history WHERE veld='start_uitzondering';")"
v "6. A07 erbij (derde actieve)" "200" "$(patch A07 '{"status":"bezig","versie":1}')"
v "7. vierde actieve" "409" "$(patch A09 '{"status":"bezig","versie":1}')"
v "   het conflict is de focusregel" "focus" "$(q conflict)"
v "   en noemt de drie actieve acties" "3" "$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/planbody','utf8')).actief.length)" 2>/dev/null || echo '?')"
v "   A09 is niet stil gestart" "niet_gestart" "$(tel "SELECT status FROM plan_actions WHERE key='A09';")"
v "8. met parkeren van A07" "200" "$(patch A09 '{"status":"bezig","versie":1,"parkeer":"A07"}')"
v "   A07 is geparkeerd" "niet_gestart" "$(tel "SELECT status FROM plan_actions WHERE key='A07';")"
v "   A09 loopt nu" "bezig" "$(tel "SELECT status FROM plan_actions WHERE key='A09';")"
# De versie eerst in een variabele: een geneste $(...) binnen dubbele quotes binnen een
# command-substitutie verminkt het argument — gemeten, en het leverde "ongeldige body" in
# plaats van de bedoelde 400. Dat leest als een geslaagde test en is het niet.
V=$(versie A01)
v "9. A01 gereed zonder bewijs" "400" "$(patch A01 '{"status":"gereed","versie":'"$V"'}')"
vbevat "   en de melding vraagt om bewijs" "bewijs" "$(q error)"
v "10. A01 gereed mét bewijs" "200" "$(patch A01 '{"status":"gereed","bewijs":"aanbod-document","versie":'"$V"'}')"
vbevat "   met een afrondingsdatum" "20" "$(tel "SELECT afgerond_op FROM plan_actions WHERE key='A01';")"
V=$(versie A01)
v "11. A01 heropenen" "200" "$(patch A01 '{"status":"bezig","versie":'"$V"'}')"
v "   het bewijs blijft staan" "aanbod-document" "$(tel "SELECT bewijs FROM plan_actions WHERE key='A01';")"
vbevat "   A02 kreeg het heropend-signaal" "heropend" "$(curl -s "$B/api/plan/acties/A02" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log((j.actie.signalen.find(s=>s.soort==='afhankelijkheid_heropend')||{}).tekst ?? 'geen')")"
V=$(versie A01)
v "12. cirkel maken" "400" "$(patch A01 '{"afhankelijkheden":["A02"],"versie":'"$V"'}')"
vbevat "   en de melding toont het pad" "cirkel" "$(q error)"
v "13. onbekende actie" "404" "$(patch A99 '{"status":"bezig","versie":1}')"
v "14. status én velden mengen" "400" "$(patch A04 '{"status":"bezig","titel":"x","versie":1}')"
vbevat "   met de reden erbij" "één soort" "$(q error)"
# De tegenhanger: wachtreden hóórt bij een statuswissel en mag wél mee. Zonder dit geval
# weigerde de meng-controle "zet op wacht op input, met deze reden" — precies wat de UI stuurt.
CODE14B=$(patch A15 '{"status":"wacht_op_input","wachtreden":"wacht op de cashflow-prompt","versie":1}')
STATUS14B=$(tel "SELECT status || ' / ' || substr(wachtreden,1,16) FROM plan_actions WHERE key = 'A15';")
v "14b. status mét zijn eigen wachtreden" "200" "$CODE14B"
vbevat "   en de reden staat erin" "wacht op de cash" "$STATUS14B"
v "15. seed-actie verwijderen" "409" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X DELETE "$B/api/plan/acties/A01")"
vbevat "   met de suggestie om te laten vervallen" "vervallen" "$(q error)"
v "16. idee toevoegen" "200" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X POST "$B/api/plan/ideeen" -H 'content-type: application/json' -d '{"titel":"Nieuwsbrief"}')"
v "   en het telt niet mee als actie" "22" "$(tel 'SELECT count(*) FROM plan_actions;')"
v "17. idee opnemen zonder prioriteit" "400" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PATCH "$B/api/plan/ideeen/1" -H 'content-type: application/json' -d '{"status":"opgenomen"}')"
v "18. idee opnemen mét prioriteit" "200" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PATCH "$B/api/plan/ideeen/1" -H 'content-type: application/json' -d '{"status":"opgenomen","prioriteit":2}')"
v "   en levert één actie met bron idee" "1" "$(tel "SELECT count(*) FROM plan_actions WHERE bron='idee';")"
v "19. bedrijf koppelen" "200" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan/koppelingen" -H 'content-type: application/json' -d '{"actie":"A07","type":"lead","key":"1"}')"
v "   en is nieuw" "true" "$(q nieuw)"
v "20. dezelfde koppeling opnieuw" "200" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan/koppelingen" -H 'content-type: application/json' -d '{"actie":"A07","type":"lead","key":"1"}')"
v "   maar niet nieuw" "false" "$(q nieuw)"
v "   en levert geen tweede rij" "1" "$(tel 'SELECT count(*) FROM plan_links;')"
v "21. onbekend bedrijf koppelen" "404" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan/koppelingen" -H 'content-type: application/json' -d '{"actie":"A07","type":"lead","key":"999"}')"
v "22. beslismoment vastleggen" "200" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PATCH "$B/api/plan/beslissingen/B01" -H 'content-type: application/json' -d '{"beslissing":"ja","versie":1}')"
vbevat "   met een datum" "20" "$(tel "SELECT beslist_op FROM plan_decisions WHERE key='B01';")"
v "23. verouderde versie op B01" "409" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PATCH "$B/api/plan/beslissingen/B01" -H 'content-type: application/json' -d '{"beslissing":"nee","versie":1}')"
v "24. het startbesluit is niet genomen" "null" "$(curl -s "$B/api/plan" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(JSON.stringify(j.plan.overzicht.startvoorwaarden.startbesluit.beslissing))")"
v "25. instellingen: 0 uur per dag" "400" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan" -H 'content-type: application/json' -d '{"instellingen":{"lancering":"2027-01","urenPerDag":0,"focusLimiet":3}}')"
v "26. instellingen: geldige wijziging" "200" "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan" -H 'content-type: application/json' -d '{"instellingen":{"lancering":"2027-03","urenPerDag":6,"focusLimiet":3}}')"
v "   en de lancering staat erin" "2027-03" "$(q instellingen.lancering)"
v "27. export json" "200" "$(curl -s -o /tmp/planbody -w '%{http_code}' "$B/api/plan/export?formaat=json")"
v "   met alle acties erin" "23" "$(q acties.length)" "22 gezaaid + 1 uit een idee"
v "28. export md" "200" "$(curl -s -o /tmp/planbody -w '%{http_code}' -D /tmp/planhdr "$B/api/plan/export?formaat=md")"
vbevat "   als markdown" "text/markdown" "$(grep -i '^content-type' /tmp/planhdr | tr -d '\r' | cut -d' ' -f2)"
v "29. export xml" "400" "$(curl -s -o /tmp/planbody -w '%{http_code}' "$B/api/plan/export?formaat=xml")"
v "30. slot: geen duplicaten" "23" "$(tel 'SELECT count(DISTINCT key) FROM plan_actions;')" "unieke keys"
v "   evenveel rijen als keys" "$(tel 'SELECT count(DISTINCT key) FROM plan_actions;')" "$(tel 'SELECT count(*) FROM plan_actions;')"

# Wat afronden van $1 zou moeten vrijgeven, afgeleid uit de rijen zélf en niet uit de app: niet
# gestart, zonder startuitzondering, hangt van $1 af, en elke andere afhankelijkheid is gereed.
# Een tweede definitie naast `uitvoerbaarheidVan` — met opzet, anders vergelijkt de probe de
# route met zichzelf.
verwachtVrij() {
  tel "SELECT a.key FROM plan_actions a
       WHERE a.status = 'niet_gestart' AND COALESCE(a.start_uitzondering, '') = ''
         AND EXISTS (SELECT 1 FROM plan_dependencies d WHERE d.action_key = a.key AND d.depends_on_key = '$1')
         AND NOT EXISTS (SELECT 1 FROM plan_dependencies d JOIN plan_actions b ON b.key = d.depends_on_key
                         WHERE d.action_key = a.key AND d.depends_on_key <> '$1' AND b.status <> 'gereed')
       ORDER BY a.key;" | paste -sd, -
}
VERW13=$(verwachtVrij A13)
v "31. de verwachting voor A13 is niet leeg" "ja" "$([ -n "$VERW13" ] && echo ja || echo nee)" "$VERW13"
V=$(versie A13)
v "   A13 gereed" "200" "$(patch A13 '{"status":"gereed","bewijs":"probe","versie":'"$V"'}')"
v "   vrijgekomen = afleiding uit de database" "$VERW13" "$(node -e "const j=JSON.parse(require('fs').readFileSync('/tmp/planbody','utf8'));console.log([...(j.vrijgekomen??['(veld ontbreekt)'])].sort().join(','))")"

# De bediening door een browser, op de toestand die hierboven is achtergelaten. Alleen hier
# mag er geklikt worden: deze database gaat na de run weg.
echo ""
echo "UI — /plan in de browser (plan-ui-probe.mjs)"
BASE="$B" SHOT="$SHOTMAP" node "$APP/scripts/plan-ui-probe.mjs" || GEZAKT=$((GEZAKT + 1))

if [ "$GEZAKT" -gt 0 ]; then
  echo ""
  echo "✗ PROBE GEZAKT — $GEZAKT assertie(s) klopten niet"
  exit 1
fi
echo ""
echo "✓ PROBE KLAAR — alle asserties geslaagd"
