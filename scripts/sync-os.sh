#!/bin/bash

# sync-os.sh — synct umanex-os naar de huidige klant-repo
# Plaats dit script in <klant-repo>/scripts/sync-os.sh
# Aanpassen per klant: UMANEX_OS_PATH en CLIENT_PROFILE
#
# Wat dit script synct:
# - .umanex-os/CLAUDE.md          (globale werkprincipes)
# - .umanex-os/profiles/{X}.md     (klant-specifiek profile)
# - ~/.claude/skills/<naam>        (globale skills uit umanex-os/skills/, user-level discovery)
#
# Wat dit script NOOIT aanraakt:
# - <klant-repo>/.claude/skills/   — klant-specifieke skills (project-level discovery)
#                                    blijven in de klant-repo en worden niet overschreven.
#                                    Project-level skills hebben voorrang op user-level, dus
#                                    een klant-skill met dezelfde naam wint van een globale.

set -uo pipefail

# === AANPASSEN PER KLANT ===
UMANEX_OS_PATH="$HOME/Documents/umanex-os"
CLIENT_PROFILE="umanex"   # opties: columba, luminus, umanex
# ============================

# Bepaal waar dit script staat en ga naar de klant-repo root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CLIENT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "→ Sync umanex-os naar $(basename "$CLIENT_ROOT")"
echo "  Profile: $CLIENT_PROFILE"
echo ""

# Check of umanex-os lokaal staat
if [ ! -d "$UMANEX_OS_PATH" ]; then
  echo "✗ umanex-os niet gevonden op $UMANEX_OS_PATH"
  echo "  Pas UMANEX_OS_PATH aan bovenaan dit script."
  exit 1
fi

# Pull laatste versie van umanex-os — non-fataal: zonder netwerk synct het script
# gewoon de lokale (mogelijk al actuele) versie i.p.v. volledig af te breken.
echo "→ Pull laatste versie uit GitHub..."
if git -C "$UMANEX_OS_PATH" pull --quiet 2>/dev/null; then
  echo "  ✓ umanex-os up-to-date"
else
  echo "  ⚠ git pull mislukt (offline of geen toegang) — verder met lokale versie"
fi
echo ""

# Maak doel-folders in klant-repo
cd "$CLIENT_ROOT"
mkdir -p .umanex-os/profiles

# Kopieer globale CLAUDE.md
echo "→ Kopieer globale CLAUDE.md..."
cp "$UMANEX_OS_PATH/CLAUDE.md" ".umanex-os/CLAUDE.md"
echo "  ✓ .umanex-os/CLAUDE.md"

# Kopieer enkel het juiste profile
echo "→ Kopieer profile: $CLIENT_PROFILE..."
if [ -f "$UMANEX_OS_PATH/profiles/$CLIENT_PROFILE.md" ]; then
  cp "$UMANEX_OS_PATH/profiles/$CLIENT_PROFILE.md" ".umanex-os/profiles/$CLIENT_PROFILE.md"
  echo "  ✓ .umanex-os/profiles/$CLIENT_PROFILE.md"
else
  echo "  ⚠ Profile $CLIENT_PROFILE.md niet gevonden in umanex-os/profiles/"
fi

# Verwijder oude in-repo skills folder als die er nog staat (legacy van vorige versie)
if [ -d ".umanex-os/skills" ]; then
  echo "→ Oude .umanex-os/skills/ folder gevonden — opruimen..."
  rm -rf ".umanex-os/skills"
  echo "  ✓ Verwijderd. Globale skills staan nu user-level in ~/.claude/skills/"
fi

# Sync globale skills naar user-level discovery (~/.claude/skills/).
# Alleen de skills die in umanex-os/skills/ staan worden beheerd — per skill schoon
# vervangen. Andere user-level skills en alle klant-repo .claude/skills/ blijven ongemoeid.
echo ""
echo "→ Sync globale skills naar ~/.claude/skills/..."
USER_SKILLS="$HOME/.claude/skills"
if [ -d "$UMANEX_OS_PATH/skills" ]; then
  mkdir -p "$USER_SKILLS"
  synced=0
  for skill_dir in "$UMANEX_OS_PATH"/skills/*/; do
    [ -d "$skill_dir" ] || continue          # geen match → overslaan
    name="$(basename "$skill_dir")"
    [ -n "$name" ] || continue               # defensief: nooit een lege naam verwijderen
    rm -rf "${USER_SKILLS:?}/$name"          # schoon vervangen; :? voorkomt rm op lege var
    cp -R "$skill_dir" "$USER_SKILLS/$name"
    echo "  ✓ $name"
    synced=$((synced + 1))
  done
  [ "$synced" -eq 0 ] && echo "  (geen globale skills gevonden in umanex-os/skills/)"
else
  echo "  ⚠ Geen umanex-os/skills/ folder gevonden — skill-sync overgeslagen"
fi

echo ""
echo "✓ Sync compleet."
echo ""
echo "Volgende stappen:"
echo "  1. Check 'git status' om te zien wat er gewijzigd is in de klant-repo"
echo "  2. Commit de wijzigingen wanneer je wil"
echo ""
echo "Let op: een gelijknamige skill in deze klant-repo's .claude/skills/ heeft voorrang"
echo "op de zojuist gesyncte globale versie in ~/.claude/skills/."
