#!/bin/bash
# tak-poort.sh — de drie controles uit CLAUDE.md vóór je vertakt, plus een vierde.
#
#   bash scripts/tak-poort.sh            # alleen kijken
#   bash scripts/tak-poort.sh --stil     # alleen de exit-status (voor in een keten)
#
# De eerste drie staan al in CLAUDE.md (Git workflow, "Eén taak tegelijk per repo"):
# onvastgelegd werk, een HEAD die niet van jou is, en een vergeten stash. De vierde is
# nieuw en komt uit een gemeten dag.
#
# GEMETEN 2026-09-10: drie merge-conflicten op één dag, alle drie op dezelfde twee
# bestanden — BACKLOG.md en .github/workflows/contract-tests.yml. Oorzaak: aan een volgende
# stap beginnen terwijl de vorige nog in review stond. Elke stap zet een backlog-item op
# `gebouwd` en voegde een CI-stap toe op hetzelfde anker, dus twee takken in review botsen
# per constructie. De schone tree zei niets, want het werk stond al in een PR.
#
# De ankerhelft is sindsdien weg (de CI-lijst komt uit een glob). Wat blijft is de
# boekhouding: BACKLOG.md, HANDOFF.md en LEARNINGS.md worden door élke stap aangeraakt.
# Vandaar: een open eigen PR die zo'n bestand raakt is een waarschuwing vóór je vertakt,
# niet een conflict achteraf.
#
# Waarschuwt, blokkeert niet — behalve op de eerste drie, die zijn hard. Exit 0 = vrij,
# 1 = tree bezet, 2 = vrij maar met een open PR op gedeelde bestanden.

set -uo pipefail
STIL=0; [ "${1:-}" = "--stil" ] && STIL=1
zeg() { [ "$STIL" -eq 1 ] || printf '%s\n' "$*"; }

GEDEELD="BACKLOG.md HANDOFF.md LEARNINGS.md CLAUDE.md"

dirty="$(git status --porcelain -uall)"
head="$(git rev-parse --abbrev-ref HEAD)"
stash="$(git stash list)"

hard=0
[ -n "$dirty" ] && { zeg "✗ onvastgelegd werk in de tree ($(printf '%s\n' "$dirty" | wc -l | tr -d ' ') pad(en))"; hard=1; }
[ "$head" != main ] && { zeg "✗ HEAD staat op '$head', niet op main — die taak loopt nog"; hard=1; }
[ -n "$stash" ] && { zeg "✗ $(printf '%s\n' "$stash" | wc -l | tr -d ' ') stash(es) — werk dat in geen enkele andere controle verschijnt"; hard=1; }
[ "$hard" -eq 1 ] && { zeg "  → tree bezet. Laat Jeroen kiezen: om beurten, eerst afronden, stashen, of een"; zeg "    tijdelijke tree in .claude/worktrees/<taak> (kosten en afronding: worktree skill)."; exit 1; }
zeg "✓ tree vrij: schoon, op main, geen stash"

# Vierde: eigen open PR's, en of ze de gedeelde boekhouding raken.
command -v gh >/dev/null 2>&1 || { zeg "· gh niet beschikbaar — open PR's niet gecontroleerd"; exit 0; }
prs="$(gh pr list --author @me --state open --json number,title,files \
        --jq '.[] | "\(.number)\t\(.title)\t\([.files[].path] | join(","))"' 2>/dev/null)" || {
  zeg "· open PR's niet op te vragen (geen netwerk of geen recht) — niet gecontroleerd"; exit 0; }

[ -z "$prs" ] && { zeg "✓ geen eigen open PR's"; exit 0; }

n=0; botsend=""
while IFS=$'\t' read -r nr titel paden; do
  [ -z "$nr" ] && continue
  n=$((n + 1))
  raak=""
  for g in $GEDEELD; do
    case ",$paden," in *",$g,"*) raak="$raak $g" ;; esac
  done
  if [ -n "$raak" ]; then
    botsend="$botsend $nr"
    zeg "⚠ PR #$nr raakt de gedeelde boekhouding:$raak"
    zeg "    $(printf '%s' "$titel" | cut -c1-72)"
  fi
done <<EOF
$prs
EOF

zeg "· $n eigen open PR('s)"
if [ -n "$botsend" ]; then
  zeg "  → Begin je nu een stap die diezelfde bestanden aanraakt, dan is een conflict geen"
  zeg "    risico maar een zekerheid. Merge eerst, of houd je statuswijziging apart tot het"
  zeg "    einde. Gemeten 2026-09-10: drie conflictrondes op één dag."
  exit 2
fi
exit 0
