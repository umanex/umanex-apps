#!/bin/bash

# sync-os.sh — synct umanex-os naar de huidige klant-repo
# Plaats dit script in <klant-repo>/scripts/sync-os.sh — dit script is identiek in elke
# klant-repo; niets per klant aanpassen.
#
# Het klant-profiel wordt NIET in dit script gezet, maar gelezen uit de repo zelf:
#   .umanex-os/profile  → één woord, de klantnaam (bv. umanex, columba, luminus).
# Zo blijft het script overal byte-identiek en kan een verkeerde kopie nooit stil het
# verkeerde profiel pakken — ontbreekt de marker, dan stopt de sync met een melding.
#
# Wat dit script synct:
# - .umanex-os/CLAUDE.md          (globale werkprincipes)
# - .umanex-os/profiles/{X}.md     (klant-specifiek profile)
# - ~/.claude/skills/<naam>        (globale skills uit umanex-os/skills/, user-level discovery)
# - ~/.claude/hooks/tcebc-reminder.sh + settings.json  (TC-EBC UserPromptSubmit hook, user-level)
# - ~/.claude/hooks/session-start-handoff.sh + settings.json  (SessionStart handoff-hook, user-level)
# - LEARNINGS.md                   (capture-staging in root + elke app, geseed als afwezig — nooit overschreven)
# - HANDOFF.md                     (sessie-handoff in root + elke app, geseed als afwezig — nooit overschreven)
#
# Wat dit script NOOIT aanraakt:
# - <klant-repo>/.claude/skills/   — klant-specifieke skills (project-level discovery)
#                                    blijven in de klant-repo en worden niet overschreven.
#                                    Project-level skills hebben voorrang op user-level, dus
#                                    een klant-skill met dezelfde naam wint van een globale.

set -uo pipefail

# Pad naar de lokale umanex-os checkout (per machine; standaard onder ~/Documents).
UMANEX_OS_PATH="$HOME/Documents/umanex-os"

# Bepaal waar dit script staat en ga naar de klant-repo root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CLIENT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Lees het klant-profiel uit de marker in de repo zelf — geen hardcoded default.
PROFILE_MARKER="$CLIENT_ROOT/.umanex-os/profile"
if [ ! -f "$PROFILE_MARKER" ]; then
  echo "✗ Geen profiel-marker gevonden op .umanex-os/profile"
  echo "  Maak hem aan met de klantnaam, bv.:  mkdir -p .umanex-os && echo umanex > .umanex-os/profile"
  exit 1
fi
CLIENT_PROFILE="$(tr -d '[:space:]' < "$PROFILE_MARKER")"
if [ -z "$CLIENT_PROFILE" ]; then
  echo "✗ Profiel-marker .umanex-os/profile is leeg — vul de klantnaam in."
  exit 1
fi

echo "→ Sync umanex-os naar $(basename "$CLIENT_ROOT")"
echo "  Profile: $CLIENT_PROFILE (uit .umanex-os/profile)"
echo ""

# Check of umanex-os lokaal staat
if [ ! -d "$UMANEX_OS_PATH" ]; then
  echo "✗ umanex-os niet gevonden op $UMANEX_OS_PATH"
  echo "  Pas UMANEX_OS_PATH aan bovenaan dit script."
  exit 1
fi

# Vereis dat umanex-os op main staat. Sync leest de working tree van umanex-os; staat die
# op een feature-branch, dan zou stale of half-afgewerkte content stilletjes propageren.
# Alleen gemergede main-content is bron-van-waarheid — dus weigeren als het niet main is.
OS_BRANCH="$(git -C "$UMANEX_OS_PATH" rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$OS_BRANCH" != "main" ]; then
  echo "✗ umanex-os staat op '$OS_BRANCH', niet op main."
  echo "  Sync propageert alleen gemergede main-content. Checkout main in umanex-os:"
  echo "    git -C \"$UMANEX_OS_PATH\" checkout main"
  echo "  en draai daarna opnieuw."
  exit 1
fi

# Pull laatste versie van umanex-os main — non-fataal: zonder netwerk synct het script
# gewoon de lokale (mogelijk al actuele) versie i.p.v. volledig af te breken.
echo "→ Pull laatste versie van main uit GitHub..."
if git -C "$UMANEX_OS_PATH" pull --quiet origin main 2>/dev/null; then
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

# Seed een leeg LEARNINGS.md in de klant-repo root én in elke app (apps/*) als die er
# nog niet is. LEARNINGS.md is een staging-bestand met repo-eigen entries — dus NOOIT
# overschrijven: bestaat het al, dan blijft het ongemoeid. De vastleggen skill voegt de
# laag-header (# Klant — <profile> resp. # Project — <app>) en entries toe bij de eerste capture.
LEARNINGS_TEMPLATE="$UMANEX_OS_PATH/templates/LEARNINGS.template.md"

seed_learnings() {
  # $1 = doelmap; seedt $1/LEARNINGS.md alleen als die nog niet bestaat
  local target="$1/LEARNINGS.md"
  if [ -f "$target" ]; then
    echo "  • $target bestaat al — ongemoeid gelaten"
  else
    cp "$LEARNINGS_TEMPLATE" "$target"
    echo "  ✓ $target aangemaakt uit template"
  fi
}

echo ""
echo "→ Seed LEARNINGS.md (root + elke app, alleen als afwezig)..."
if [ ! -f "$LEARNINGS_TEMPLATE" ]; then
  echo "  ⚠ templates/LEARNINGS.template.md niet gevonden — seed overgeslagen"
else
  seed_learnings "."
  if [ -d "apps" ]; then
    for app_dir in apps/*/; do
      [ -d "$app_dir" ] || continue          # geen match → overslaan
      seed_learnings "${app_dir%/}"
    done
  fi
fi

# Seed HANDOFF.md (root + elke app) — vooruitkijkende tegenhanger van LEARNINGS.md,
# gevuld door de sessie-reflectie skill en getoond bij sessiestart via de handoff-hook.
# Zelfde regel: repo-eigen staging, dus NOOIT overschrijven.
HANDOFF_TEMPLATE="$UMANEX_OS_PATH/templates/HANDOFF.template.md"

seed_handoff() {
  # $1 = doelmap; seedt $1/HANDOFF.md alleen als die nog niet bestaat
  local target="$1/HANDOFF.md"
  if [ -f "$target" ]; then
    echo "  • $target bestaat al — ongemoeid gelaten"
  else
    cp "$HANDOFF_TEMPLATE" "$target"
    echo "  ✓ $target aangemaakt uit template"
  fi
}

echo ""
echo "→ Seed HANDOFF.md (root + elke app, alleen als afwezig)..."
if [ ! -f "$HANDOFF_TEMPLATE" ]; then
  echo "  ⚠ templates/HANDOFF.template.md niet gevonden — seed overgeslagen"
else
  seed_handoff "."
  if [ -d "apps" ]; then
    for app_dir in apps/*/; do
      [ -d "$app_dir" ] || continue          # geen match → overslaan
      seed_handoff "${app_dir%/}"
    done
  fi
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

# Context-snapshot systeem: generieke generator + dependency-vrije git hook.
# Snapshots zijn commit-time tooling (lokaal), dus dit rijdt mee met de lokale sync,
# niet met de CI-laag. De hook wordt geactiveerd via core.hooksPath=.githooks.
echo ""
echo "→ Installeer context-snapshot systeem..."
GEN_SNAPSHOT="$UMANEX_OS_PATH/templates/gen-snapshot.sh"
GITHOOK="$UMANEX_OS_PATH/templates/githooks-pre-commit"
CONTEXT_TEMPLATE="$UMANEX_OS_PATH/templates/context.json.template"

if [ -f "$GEN_SNAPSHOT" ]; then
  mkdir -p scripts
  cp "$GEN_SNAPSHOT" scripts/gen-snapshot.sh
  chmod +x scripts/gen-snapshot.sh
  echo "  ✓ scripts/gen-snapshot.sh"
else
  echo "  ⚠ templates/gen-snapshot.sh niet gevonden — overgeslagen"
fi

if [ -f "$GITHOOK" ]; then
  mkdir -p .githooks
  cp "$GITHOOK" .githooks/pre-commit
  chmod +x .githooks/pre-commit
  git config core.hooksPath .githooks
  echo "  ✓ .githooks/pre-commit (core.hooksPath gezet)"
else
  echo "  ⚠ templates/githooks-pre-commit niet gevonden — hook overgeslagen"
fi

# context.json is repo-eigen input — alleen scaffolden als afwezig, nooit overschrijven.
if [ -f "context.json" ]; then
  echo "  • context.json bestaat al — ongemoeid gelaten"
elif [ -f "$CONTEXT_TEMPLATE" ]; then
  cp "$CONTEXT_TEMPLATE" context.json
  echo "  ✓ context.json aangemaakt uit template — vul de Figma-gegevens per app in"
fi

# TC-EBC UserPromptSubmit hook: user-level (~/.claude), net als de skills — niet repo-lokaal.
# Bron: umanex-os/templates/tcebc-reminder.sh. Activatie = het script kopiëren én een hook-entry
# in ~/.claude/settings.json. settings.json is je eigen config, dus MERGEN met jq (idempotent:
# alleen toevoegen als de entry nog ontbreekt), nooit overschrijven.
echo ""
echo "→ Installeer TC-EBC UserPromptSubmit hook (user-level)..."
TCEBC_SRC="$UMANEX_OS_PATH/templates/tcebc-reminder.sh"
USER_HOOKS="$HOME/.claude/hooks"
USER_SETTINGS="$HOME/.claude/settings.json"
HOOK_CMD="$USER_HOOKS/tcebc-reminder.sh"
if [ ! -f "$TCEBC_SRC" ]; then
  echo "  ⚠ templates/tcebc-reminder.sh niet gevonden — hook overgeslagen"
else
  mkdir -p "$USER_HOOKS"
  cp "$TCEBC_SRC" "$HOOK_CMD"
  chmod +x "$HOOK_CMD"
  echo "  ✓ ~/.claude/hooks/tcebc-reminder.sh"
  if ! command -v jq >/dev/null 2>&1; then
    echo "  ⚠ jq niet gevonden — settings.json niet aangepast. Voeg de UserPromptSubmit-hook handmatig toe (zie docs/architecture.md)."
  else
    [ -f "$USER_SETTINGS" ] || echo '{}' > "$USER_SETTINGS"
    if jq -e --arg cmd "$HOOK_CMD" '.hooks.UserPromptSubmit[]?.hooks[]? | select(.command == $cmd)' "$USER_SETTINGS" >/dev/null 2>&1; then
      echo "  • settings.json bevat de hook al — ongemoeid gelaten"
    else
      _tmp="$(mktemp)"
      if jq --arg cmd "$HOOK_CMD" '.hooks.UserPromptSubmit += [{"hooks":[{"type":"command","command":$cmd,"timeout":10,"statusMessage":"TC-EBC check"}]}]' "$USER_SETTINGS" > "$_tmp" 2>/dev/null; then
        mv "$_tmp" "$USER_SETTINGS"
        echo "  ✓ UserPromptSubmit-hook toegevoegd aan settings.json (open /hooks of herstart om te activeren)"
      else
        rm -f "$_tmp"
        echo "  ⚠ kon settings.json niet bewerken — controleer of het geldige JSON is"
      fi
    fi
  fi
fi

# SessionStart handoff-hook: user-level, zelfde patroon als de TC-EBC-hook hierboven.
# Toont bij sessiestart de open HANDOFF-items. Script kopiëren + een SessionStart-entry
# mergen in ~/.claude/settings.json met jq (idempotent — alleen toevoegen als hij ontbreekt).
echo ""
echo "→ Installeer SessionStart handoff-hook (user-level)..."
HANDOFF_HOOK_SRC="$UMANEX_OS_PATH/templates/session-start-handoff.sh"
HANDOFF_HOOK_CMD="$USER_HOOKS/session-start-handoff.sh"
if [ ! -f "$HANDOFF_HOOK_SRC" ]; then
  echo "  ⚠ templates/session-start-handoff.sh niet gevonden — hook overgeslagen"
else
  mkdir -p "$USER_HOOKS"
  cp "$HANDOFF_HOOK_SRC" "$HANDOFF_HOOK_CMD"
  chmod +x "$HANDOFF_HOOK_CMD"
  echo "  ✓ ~/.claude/hooks/session-start-handoff.sh"
  if ! command -v jq >/dev/null 2>&1; then
    echo "  ⚠ jq niet gevonden — settings.json niet aangepast. Voeg de SessionStart-hook handmatig toe (zie docs/architecture.md)."
  else
    [ -f "$USER_SETTINGS" ] || echo '{}' > "$USER_SETTINGS"
    if jq -e --arg cmd "$HANDOFF_HOOK_CMD" '.hooks.SessionStart[]?.hooks[]? | select(.command == $cmd)' "$USER_SETTINGS" >/dev/null 2>&1; then
      echo "  • settings.json bevat de hook al — ongemoeid gelaten"
    else
      _tmp="$(mktemp)"
      if jq --arg cmd "$HANDOFF_HOOK_CMD" '.hooks.SessionStart += [{"hooks":[{"type":"command","command":$cmd,"timeout":10,"statusMessage":"Handoff surface"}]}]' "$USER_SETTINGS" > "$_tmp" 2>/dev/null; then
        mv "$_tmp" "$USER_SETTINGS"
        echo "  ✓ SessionStart-hook toegevoegd aan settings.json (open /hooks of herstart om te activeren)"
      else
        rm -f "$_tmp"
        echo "  ⚠ kon settings.json niet bewerken — controleer of het geldige JSON is"
      fi
    fi
  fi
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
