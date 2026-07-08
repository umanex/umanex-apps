#!/bin/bash
# gen-snapshot.sh — genereert per app een context-snapshot.md voor Claude-sessies.
# Bevat o.a. een AFGELEIDE component-inventaris (uit // @figma-headers + design-snapshot
# sidecars), zodat "welke componenten bestaan er en waar" niet meer hand-onderhouden of
# gegrept hoeft te worden. Vervangt de vroegere handmatige Figma-koppelingstabel.
#
# Canonieke bron: umanex-os/templates/gen-snapshot.sh — wijzig hier, sync naar klant-repos
# via scripts/sync-os.sh. Niet per klant aanpassen.
#
# Gebruik: ./scripts/gen-snapshot.sh [<app>|all]   (default: all)
#
# Klant-agnostisch: detecteert apps (apps/*) en packages (packages/*) automatisch.
# Per-app metadata (Figma key/url, beschrijving) komt uit context.json indien aanwezig,
# gematcht op het .dir-veld (apps/<app>) — niet op de JSON-key, want die kan afwijken
# (bv. key "enviroMobile" → dir "apps/enviro-mobile"). Ontbreekt de data, dan worden
# [TODO]-placeholders geschreven zodat de snapshot toch bruikbaar is.

set -uo pipefail

CONTEXT_JSON="./context.json"
DATE="$(date +%Y-%m-%d)"
TARGET="${1:-all}"

has_jq() { command -v jq >/dev/null 2>&1; }

# Lees een veld voor een app uit context.json, gematcht op .dir == apps/<app>.
ctx_field() {
  # $1 = app (dir-basename), $2 = veldnaam
  [ -f "$CONTEXT_JSON" ] && has_jq || { echo ""; return; }
  jq -r --arg dir "apps/$1" --arg f "$2" \
    '(.apps // {}) | to_entries[]? | select(.value.dir == $dir) | .value[$f] // empty' \
    "$CONTEXT_JSON" 2>/dev/null | head -1
}

# Lijst alle shared packages (naam + versie) uit packages/*/package.json.
list_packages() {
  local found=0 pj name ver
  for pj in packages/*/package.json; do
    [ -f "$pj" ] || continue
    found=1
    if has_jq; then
      name="$(jq -r '.name // "?"' "$pj" 2>/dev/null)"
      ver="$(jq -r '.version // "?"' "$pj" 2>/dev/null)"
      echo "- **$name:** $ver"
    else
      echo "- $(dirname "$pj")"
    fi
  done
  [ "$found" -eq 0 ] && echo "- (geen shared packages)"
}

# Afgeleide component-inventaris voor een app: elk PascalCase .tsx-component (1 file = 1
# component), met categorie (parent-folder), Figma-node (uit de // @figma-header),
# snapshot-aanwezigheid en een afgeleide koppelstatus. Niet hand-onderhouden.
list_components() {
  local app_dir="$1"
  local found=0 f base name dir cat node figma snap status
  while IFS= read -r f; do
    base="$(basename "$f")"
    name="${base%.tsx}"
    case "$name" in [ABCDEFGHIJKLMNOPQRSTUVWXYZ]*) ;; *) continue ;; esac   # PascalCase (expliciet, locale-onafhankelijk — [A-Z] matcht in UTF-8 ook lowercase)
    found=1
    dir="$(dirname "$f")"
    cat="$(basename "$dir")"
    [ "$cat" = "$name" ] && cat="$(basename "$(dirname "$dir")")"   # single-component PascalCase-map → taxonomie-map erboven
    node="$(head -5 "$f" 2>/dev/null | grep -o 'node-id=[^] &)\"]*' | head -1)"
    if [ -n "$node" ]; then figma="\`$node\`"
    elif head -5 "$f" 2>/dev/null | grep -q '@figma'; then figma="✓"
    else figma="—"; fi
    if [ -f "$dir/$name.design-snapshot.md" ]; then snap="✓"; else snap="—"; fi
    if [ "$figma" != "—" ] || [ "$snap" = "✓" ]; then status="gekoppeld"; else status="—"; fi
    echo "| $name | \`$f\` | $cat | $figma | $snap | $status |"
  done < <(find "$app_dir" -type f -name '*.tsx' \
             -not -path '*/node_modules/*' -not -path '*/.next/*' \
             -not -name '*.test.tsx' -not -name '*.stories.tsx' 2>/dev/null | sort)
  [ "$found" -eq 0 ] && echo "| _(geen componenten gevonden)_ | — | — | — | — | — |"
}

generate_snapshot() {
  local app="$1"
  local app_dir="apps/$app"
  if [ ! -d "$app_dir" ]; then
    echo "⚠ $app_dir bestaat niet — overgeslagen"
    return
  fi

  local figma_key figma_url description recent changed todos packages
  figma_key="$(ctx_field "$app" figmaKey)";   [ -n "$figma_key" ]   || figma_key="[TODO: figmaKey in context.json]"
  figma_url="$(ctx_field "$app" figmaUrl)";    [ -n "$figma_url" ]   || figma_url="[TODO: figmaUrl in context.json]"
  description="$(ctx_field "$app" description)"; [ -n "$description" ] || description="[TODO: description in context.json]"

  recent="$(git log --oneline -5 -- "$app_dir" packages 2>/dev/null)"; [ -n "$recent" ] || recent="(geen commits gevonden)"
  changed="$(git status --short -- "$app_dir" packages 2>/dev/null | head -10 | sed 's/^/  /')"; [ -n "$changed" ] || changed="  (geen)"
  todos="$(grep -rl "TODO\|FIXME\|HACK" "$app_dir/src" --include='*.tsx' --include='*.ts' 2>/dev/null | head -10 | sed 's/^/  - /')"; [ -n "$todos" ] || todos="  (geen)"
  packages="$(list_packages)"
  components="$(list_components "$app_dir")"

  cat > "$app_dir/context-snapshot.md" << EOF
# Context Snapshot — $app
_Gegenereerd op ${DATE}_

## Project
- **App:** $app
- **Beschrijving:** $description
- **Dir:** \`$app_dir\`

## Figma
- **Key:** \`$figma_key\`
- **URL:** $figma_url
- ⚠️ Node IDs veranderen na edits — altijd opnieuw ophalen via "Copy link to selection"

## Packages
$packages

## Componenten
_Afgeleid uit de codebase — niet manueel aanpassen. Bron: \`// @figma\`-headers + co-located \`.design-snapshot.md\` sidecars._

| Component | Pad | Categorie | Figma-node | Snapshot | Status |
|---|---|---|---|---|---|
$components

## Recente commits (app + packages)
\`\`\`
$recent
\`\`\`

## Uncommitted wijzigingen
$changed

## Bestanden met TODO/FIXME
$todos

## MCP
- Figma Console MCP (Desktop Bridge) is primair voor lezen én schrijven; native Figma MCP is fallback.
EOF
  echo "✅ Snapshot gegenereerd: $app_dir/context-snapshot.md"
}

if [ "$TARGET" = "all" ]; then
  if [ ! -d apps ]; then
    echo "geen apps/ map — niets te doen"
    exit 0
  fi
  for d in apps/*/; do
    [ -d "$d" ] || continue
    generate_snapshot "$(basename "$d")"
  done
else
  generate_snapshot "$TARGET"
fi
