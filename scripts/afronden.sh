#!/bin/bash
# afronden.sh — het merge-protocol uit CLAUDE.md als commando, inclusief het bijtrekken van
# élke tree die achterloopt.
#
#   bash scripts/afronden.sh <pr-nummer> [--droog]
#   bash scripts/afronden.sh <pr-nummer> --tree .claude/worktrees/<taak>
#
# WAAROM EEN SCRIPT EN GEEN BLOK IN CLAUDE.md. De procedure stond daar als bash-blok en ging
# negen keer mis in dezelfde vorm (LEARNINGS, negen git-procedure-entries). De laatste,
# 2026-09-17: de afrondstap eindigde op `git pull --ff-only origin main` in de hoofdtree, en
# was alleen getoetst in een repo waar de hoofdtree op `main` stond. De procedure bestaat
# juist voor het geval dat hij níet op main staat — en daar schuift die pull een feature
# branch zonder eigen commit stil naar main (rc=0). Een blok dat je overtikt kan geen
# fixture-toestanden kennen; een script wel, en `scripts/test-procedures.sh` draait het
# tegen alle vier.
#
# WAT HET AFDWINGT
#   · De PR-state is de enige gate. `gh pr merge` kan weigeren (checks lopen nog) terwijl de
#     keten doorloopt; gemeten 2026-08-25 op PR umanex-apps#312: beide branches verdwenen en
#     de PR sloot. Daarom: rc én state lezen, vóór welke pipe ook, vóór er iets opgeruimd wordt.
#   · Opruimen gebeurt pas ná bevestiging dat de state MERGED is — nooit in dezelfde keten
#     achter de merge aan.
#   · Een tree die niet op `main` staat, wordt NIET gepulld. Hij wordt gemeld.
#
# EXIT-CODES
#   0  gemerged, opgeruimd, alle trees bijgetrokken
#   1  de merge ging niet door — er is niets opgeruimd
#   2  gemerged en opgeruimd, maar minstens één tree kon niet bijgetrokken worden (staat niet
#      op main, of is een losse HEAD) — dat is werk voor een mens, geen stille fout
#   3  gemerged, maar de tijdelijke tree is NIET verwijderd omdat er werk in stond dat
#      nergens anders staat. Nooit `--force` op eigen gezag.
#
# --tree: DE WORKTREE-MODUS. `git checkout main` faalt in een linked tree (*already used by
# worktree*), dus daar geldt een andere volgorde, gemeten 2026-09-17 in een wegwerp-repo:
# eerst mergen, dan de tree weg, dán de branch — `git branch -d` weigert zolang de tree
# bestaat (*cannot delete branch … used by worktree*). En `git worktree remove` weigert bij
# ongetrackt werk; dat is de laatste controle op werk dat nergens anders staat.

set -uo pipefail

PR="${1:-}"; DROOG=0; TREE=""
shift 2>/dev/null || true
while [ $# -gt 0 ]; do
  case "$1" in
    --droog) DROOG=1 ;;
    --tree)  shift; TREE="${1:-}" ;;
    *) echo "onbekend argument: $1"; exit 1 ;;
  esac
  shift
done
[ -n "$PR" ] || { echo "gebruik: afronden.sh <pr-nummer> [--droog] [--tree <pad>]"; exit 1; }
[ -z "$TREE" ] || [ -d "$TREE" ] || { echo "STOP — tree '$TREE' bestaat niet"; exit 1; }

REPO="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "STOP — geen git-repo"; exit 1; }
BRANCH="$(git -C "${TREE:-$REPO}" rev-parse --abbrev-ref HEAD)"
command -v gh >/dev/null 2>&1 || { echo "STOP — gh niet beschikbaar"; exit 1; }

echo "→ PR #$PR vanaf branch '$BRANCH' in $REPO"

if [ "$DROOG" -eq 1 ]; then
  state="$(gh pr view "$PR" --json state -q .state 2>/dev/null || echo ONBEKEND)"
  echo "  droogloop: state=$state — er wordt niets gemerged of opgeruimd"
  exit 0
fi

# 1. Naar main, dan mergen. Status lezen vóór welke pipe ook.
# In worktree-modus NIET uitchecken: `git checkout main` faalt in een linked tree, en de
# hoofdtree is hier niet aan de beurt — die wordt in stap 3 bijgetrokken.
if [ -z "$TREE" ]; then
  out="$(git -C "$REPO" checkout main 2>&1)"; rc=$?
  [ "$rc" -eq 0 ] || { echo "STOP — checkout main faalde: $out"; exit 1; }
fi

out="$(gh pr merge "$PR" --merge 2>&1)"; rc=$?
echo "$out"
state="$(gh pr view "$PR" --json state -q .state 2>/dev/null || echo ONBEKEND)"
[ "$rc" -eq 0 ] && [ "$state" = MERGED ] || { echo "STOP — rc=$rc state=$state, niets opruimen"; exit 1; }
echo "  ✓ PR #$PR is MERGED"

# 2. Pas nu opruimen. `git branch -d` toetst tegen de upstream, niet tegen main — dus de
#    PR-state hierboven is de echte gate, niet deze twee regels.
#    In worktree-modus eerst de tree weg: `git branch -d` weigert zolang hij bestaat.
if [ -n "$TREE" ]; then
  out="$(git -C "$REPO" worktree remove "$TREE" 2>&1)"; rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "  ✗ tree '$TREE' niet verwijderd: $out"
    echo "    Dat is de laatste controle op werk dat nergens anders staat. Kijk wat erin"
    echo "    zit en beslis zelf; nooit --force op eigen gezag. De PR is wél gemerged."
    exit 3
  fi
  echo "  ✓ tree '$TREE' verwijderd"
fi
git -C "$REPO" branch -d "$BRANCH" && git -C "$REPO" push origin --delete "$BRANCH"
echo "  ✓ branch '$BRANCH' opgeruimd"

# 3. Elke tree bijtrekken. `git worktree list` is de vinder — een lege `lsof` betekent
#    "geen listener", niet "geen gat".
rest=0
git -C "$REPO" worktree list --porcelain | awk '/^worktree /{print $2}' | while IFS= read -r map; do
  [ -d "$map" ] || continue
  git -C "$map" fetch --quiet origin main 2>/dev/null
  achter="$(git -C "$map" rev-list --count HEAD..origin/main 2>/dev/null || echo '?')"
  head="$(git -C "$map" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  if [ "$achter" = 0 ]; then
    printf '  ✓ %-52s bij\n' "$map"
  elif [ "$head" != main ]; then
    # DIT is de as waarop de procedure negen keer faalde: niet pullen, melden.
    printf '  ⚠ %-52s %s commits achter, HEAD=%s — NIET gepulld, overleg\n' "$map" "$achter" "$head"
    echo "$map" >> "${TMPDIR:-/tmp}/afronden-rest.$$"
  else
    git -C "$map" pull --ff-only origin main >/dev/null 2>&1 \
      && printf '  ✓ %-52s bijgetrokken (%s commits)\n' "$map" "$achter" \
      || printf '  ⚠ %-52s pull faalde\n' "$map"
  fi
done

if [ -f "${TMPDIR:-/tmp}/afronden-rest.$$" ]; then
  echo
  echo "  ✗ Niet elke tree staat op de gemergede code. Serveert daar een dev-server uit,"
  echo "    dan toont hij nog de oude versie — 'gemerged' melden is dan onwaar."
  rm -f "${TMPDIR:-/tmp}/afronden-rest.$$"
  rest=2
fi
exit "$rest"
