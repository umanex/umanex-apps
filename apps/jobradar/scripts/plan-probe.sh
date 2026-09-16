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
p "1. tweede GET zaait niet opnieuw"                "$(tel 'SELECT count(*) FROM plan_actions;') acties"
p "   en A18 staat uitgesteld met een aanleiding"   "$(tel "SELECT status||' / '||substr(wachtreden,1,24) FROM plan_actions WHERE key='A18';")"
p "   inzet start op onbekend"                      "$(tel 'SELECT count(*) FROM plan_actions WHERE inschatting_uren IS NULL;')/22 NULL"

p "2. A01 op bezig"                                 "$(patch A01 '{"status":"bezig","versie":1}')  versie=$(versie A01)"
p "3. dezelfde versie opnieuw (verwacht 409)"       "$(patch A01 '{"status":"gereed","versie":1,"bewijs":"x"}')  conflict=$(q conflict)"
p "4. A02 starten met open blokkade (verwacht 409)" "$(patch A02 '{"status":"bezig","versie":1}')  conflict=$(q conflict)"
p "5. A02 met vastgelegde uitzondering"             "$(patch A02 '{"status":"bezig","versie":1,"startUitzondering":"A01 is inhoudelijk rond"}')  gelogd=$(tel "SELECT count(*) FROM plan_history WHERE veld='start_uitzondering';")"
p "6. A07 erbij (derde actieve)"                    "$(patch A07 '{"status":"bezig","versie":1}')"
p "7. vierde actieve (verwacht 409 focus)"          "$(patch A09 '{"status":"bezig","versie":1}')  actief=$(q limiet) van $(node -e "const j=require('/tmp/planbody');console.log(j.actief.map(a=>a.key).join(','))" 2>/dev/null || q conflict)"
p "8. met parkeren van A07"                         "$(patch A09 '{"status":"bezig","versie":1,"parkeer":"A07"}')  A07=$(tel "SELECT status FROM plan_actions WHERE key='A07';")"
# De versie eerst in een variabele: een geneste $(...) binnen dubbele quotes binnen een
# command-substitutie verminkt het argument — gemeten, en het leverde "ongeldige body" in
# plaats van de bedoelde 400. Dat leest als een geslaagde test en is het niet.
V=$(versie A01)
p "9. A01 gereed zonder bewijs (verwacht 400)"      "$(patch A01 '{"status":"gereed","versie":'"$V"'}')  reden=$(q error)"
p "10. A01 gereed mét bewijs"                       "$(patch A01 '{"status":"gereed","bewijs":"aanbod-document","versie":'"$V"'}')  afgerond=$(tel "SELECT afgerond_op FROM plan_actions WHERE key='A01';")"
V=$(versie A01)
p "11. A01 heropenen"                               "$(patch A01 '{"status":"bezig","versie":'"$V"'}')  bewijs=$(tel "SELECT substr(bewijs,1,16) FROM plan_actions WHERE key='A01';")"
p "   A02 kreeg het heropend-signaal"               "$(curl -s "$B/api/plan/acties/A02" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log((j.actie.signalen.find(s=>s.soort==='afhankelijkheid_heropend')||{}).tekst ?? 'geen')")"
V=$(versie A01)
p "12. cirkel maken (verwacht 400)"                 "$(patch A01 '{"afhankelijkheden":["A02"],"versie":'"$V"'}')  reden=$(q error)"
p "13. onbekende actie (verwacht 404)"              "$(patch A99 '{"status":"bezig","versie":1}')"
p "14. status én velden mengen (verwacht 400)"      "$(patch A04 '{"status":"bezig","titel":"x","versie":1}')  reden=$(q error)"
# De tegenhanger: wachtreden hóórt bij een statuswissel en mag wél mee. Zonder dit geval
# weigerde de meng-controle "zet op wacht op input, met deze reden" — precies wat de UI stuurt.
CODE14B=$(patch A15 '{"status":"wacht_op_input","wachtreden":"wacht op de cashflow-prompt","versie":1}')
STATUS14B=$(tel "SELECT status || ' / ' || substr(wachtreden,1,16) FROM plan_actions WHERE key = 'A15';")
p "14b. status mét zijn eigen wachtreden (verwacht 200)" "$CODE14B  $STATUS14B"
p "15. seed-actie verwijderen (verwacht 409)"       "$(curl -s -o /tmp/planbody -w '%{http_code}' -X DELETE "$B/api/plan/acties/A01")  reden=$(q error)"
p "16. idee toevoegen"                              "$(curl -s -o /tmp/planbody -w '%{http_code}' -X POST "$B/api/plan/ideeen" -H 'content-type: application/json' -d '{"titel":"Nieuwsbrief"}')  telt niet mee: $(tel 'SELECT count(*) FROM plan_actions;') acties"
p "17. idee opnemen zonder prioriteit (400)"        "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PATCH "$B/api/plan/ideeen/1" -H 'content-type: application/json' -d '{"status":"opgenomen"}')  reden=$(q error)"
p "18. idee opnemen mét prioriteit"                 "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PATCH "$B/api/plan/ideeen/1" -H 'content-type: application/json' -d '{"status":"opgenomen","prioriteit":2}')  nieuw=$(tel "SELECT key||' / '||bron FROM plan_actions WHERE bron='idee';")"
p "19. bedrijf koppelen"                            "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan/koppelingen" -H 'content-type: application/json' -d '{"actie":"A07","type":"lead","key":"1"}')  nieuw=$(q nieuw)"
p "20. dezelfde koppeling opnieuw"                  "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan/koppelingen" -H 'content-type: application/json' -d '{"actie":"A07","type":"lead","key":"1"}')  nieuw=$(q nieuw)  rijen=$(tel 'SELECT count(*) FROM plan_links;')"
p "21. onbekend bedrijf koppelen (verwacht 404)"    "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan/koppelingen" -H 'content-type: application/json' -d '{"actie":"A07","type":"lead","key":"999"}')"
p "22. beslismoment vastleggen"                     "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PATCH "$B/api/plan/beslissingen/B01" -H 'content-type: application/json' -d '{"beslissing":"ja","versie":1}')  datum=$(tel "SELECT beslist_op FROM plan_decisions WHERE key='B01';")"
p "23. verouderde versie op B01 (verwacht 409)"     "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PATCH "$B/api/plan/beslissingen/B01" -H 'content-type: application/json' -d '{"beslissing":"nee","versie":1}')"
p "24. startbesluit is niet genomen"                "$(curl -s "$B/api/plan" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));const s=j.plan.overzicht.startvoorwaarden;console.log('hard '+s.hardGereed+'/'+s.hard.length,'startbesluit='+(s.startbesluit.beslissing ?? 'nog niet genomen'))")"
p "25. instellingen: 0 uur per dag (verwacht 400)"  "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan" -H 'content-type: application/json' -d '{"instellingen":{"lancering":"2027-01","urenPerDag":0,"focusLimiet":3}}')  reden=$(q error)"
p "26. instellingen: geldige wijziging"             "$(curl -s -o /tmp/planbody -w '%{http_code}' -X PUT "$B/api/plan" -H 'content-type: application/json' -d '{"instellingen":{"lancering":"2027-03","urenPerDag":6,"focusLimiet":3}}')  lancering=$(q instellingen.lancering)"
p "27. export json"                                 "$(curl -s -o /tmp/planbody -w '%{http_code}' "$B/api/plan/export?formaat=json")  acties=$(q acties.length)"
p "28. export md"                                   "$(curl -s -o /tmp/planbody -w '%{http_code}' -D /tmp/planhdr "$B/api/plan/export?formaat=md")  type=$(grep -i '^content-type' /tmp/planhdr | tr -d '\r' | cut -d' ' -f2)"
p "29. export xml (verwacht 400)"                   "$(curl -s -o /tmp/planbody -w '%{http_code}' "$B/api/plan/export?formaat=xml")"
p "30. slot: geen duplicaten"                       "$(tel 'SELECT count(*) FROM plan_actions;') acties, $(tel 'SELECT count(DISTINCT key) FROM plan_actions;') unieke keys"
echo "PROBE KLAAR"
