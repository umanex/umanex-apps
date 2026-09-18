#!/bin/bash
# checklijst.sh — één run, alle acceptatie-items, één tabel.
#
#   source "$(dirname "$0")/checklijst.sh"
#   groep "Layout"
#   check   L1 "CTA's op één hoogte"        "$(meet 'node scripts/meet.mjs y')"  612
#   tegen   L2 "TEGENPROEF: losse knop wijkt af" "$(meet 'node scripts/meet.mjs y --los')" 0
#   rapport
#
# WAAROM DIT BESTAAT — twee gemeten kosten, en ze hangen samen.
#
# 1. DE PRIJS VAN EEN LOSSE PROBE. Gemeten over 103 sessies (2026-09-01 → 09-18, 40 838
#    turns): 74,3% van alle tokenkost is cache-read — de conversatie die bij élke beurt
#    opnieuw meereist. Eén extra tool-call kost daardoor gemiddeld 44,3k eenheden en levert
#    mediaan 0,4k tekens op. Een acceptatielijst van twaalf items als twaalf losse Bash-calls
#    kost ~530k eenheden; als één run kost hij er ~44k. De kost per beurt groeit bovendien mét
#    de sessie (30,6k onder de 50 turns → 65,8k boven de 1500), dus elke losse probe maakt elke
#    vólgende duurder. Niet de checks zijn duur — het aantal beurten waarin ze verspreid staan.
#
# 2. DE PRIJS VAN EEN CHECK DIE NIET ROOD KAN WORDEN. Vier van de zeven open LEARNINGS-entries
#    op 2026-09-18 waren dezelfde faalklasse: een instrument dat per constructie niet kon
#    afwijken. Een grader met `pattern: '#### F1'` die vanaf dag één nul kon geven; een guard
#    (`git diff --quiet`) blind voor een ongetrackt bestand; een derde toestand (*niets
#    gemeten*) die op een hoger niveau in twee plooide; een check die de regel van de code
#    narekende in plaats van de uitkomst te toetsen — groen op 119/119 terwijl het scherm stuk
#    was. Het Beoordeel-blok in CLAUDE.md stond op dat moment op 7583 van 7600 chars, dus een
#    vijftiende rail was geen optie. Dit script neemt de handhaving over van de tekst.
#
# WAT HET AFDWINGT — de drie dingen die die vier entries gemeen hadden:
#
#   a) Elke check draagt een VERWACHTING. Het is een verplicht argument, dus "groen" kan niet
#      ontstaan doordat niemand zei wat er had moeten staan.
#   b) Elke groep draagt minstens één TEGENPROEF. Een groep zonder tegenproef sluit af met
#      exit 2 — "deze groep kan niet rood worden" is een uitkomst, geen stilte.
#   c) Er zijn DRIE uitkomsten, niet twee. `??` (niet te meten) plooit nooit stil in PASS.
#
# EXIT-CODES:
#   0  alles gemeten, alles zoals verwacht
#   1  minstens één FAIL — gemeten en rood
#   2  de ronde kon niet meten: een groep zonder tegenproef, of alleen `??`
#
# Het verschil tussen 1 en 2 is het punt. Een run die niets kón meten is geen geslaagde run.

set -uo pipefail

_C_PASS=0; _C_FAIL=0; _C_ONBE=0
_C_ECHT=0   # PASS/FAIL op niet-tegenproef-items: alleen die zeggen iets over het wérk
_C_GROEP=""; _C_GROEP_TEGEN=0; _C_GROEP_N=0
_C_GEEN_TEGEN=""
_C_BEWIJS=()

# meet — draai een commando en geef zijn uitvoer terug, met de exit-status vóór welke pipe ook.
# Faalt het commando, dan is de uitkomst `??` en niet een lege string die als 0 kan lezen.
meet() {
  local uit rc
  uit="$(eval "$1" 2>&1)"; rc=$?
  if [ "$rc" -ne 0 ] && [ -z "$uit" ]; then printf '??'; else printf '%s' "$(printf '%s' "$uit" | tr -d '\n')"; fi
}

groep() {
  _sluit_groep
  _C_GROEP="$1"; _C_GROEP_TEGEN=0; _C_GROEP_N=0
  printf '\n  %s\n' "$1"
}

_sluit_groep() {
  [ -z "$_C_GROEP" ] && return 0
  if [ "$_C_GROEP_N" -gt 0 ] && [ "$_C_GROEP_TEGEN" -eq 0 ]; then
    printf '    %-6s %-5s %s\n' "—" "GEEN" "TEGENPROEF in deze groep: ze kan niet rood worden"
    _C_GEEN_TEGEN="$_C_GEEN_TEGEN $_C_GROEP"
  fi
}

_rij() { # $1=id $2=omschrijving $3=uitkomst $4=verwacht $5=merk
  local id="$1" oms="$2" uit="$3" verw="$4" merk="${5:-}"
  _C_GROEP_N=$((_C_GROEP_N + 1))
  if [ "$uit" = "??" ]; then
    printf '    %-6s %-5s %-44s %s\n' "$id" "??" "$oms" "niet te meten"
    _C_ONBE=$((_C_ONBE + 1)); return 0
  fi
  if [ "$uit" = "$verw" ]; then
    printf '    %-6s %-5s %-44s %s\n' "$id" "PASS" "$oms" "= $verw"
    _C_PASS=$((_C_PASS + 1)); [ "$merk" = tegen ] || _C_ECHT=$((_C_ECHT + 1))
    [ "$merk" = tegen ] || _C_BEWIJS+=("- [x] $oms — bewijs: $uit ($id, $(date +%F))")
  else
    printf '    %-6s %-5s %-44s %s\n' "$id" "FAIL" "$oms" "kreeg $uit, verwacht $verw"
    _C_FAIL=$((_C_FAIL + 1)); [ "$merk" = tegen ] || _C_ECHT=$((_C_ECHT + 1))
    [ "$merk" = tegen ] || _C_BEWIJS+=("- [ ] $oms — gemeten: $uit, verwacht $verw ($id)")
  fi
}

# check — een gewoon acceptatie-item.
check() { _rij "$1" "$2" "$3" "$4" ""; }

# tegen — een tegenproef: hij hoort het defect zélf te dragen. Hij telt mee in PASS/FAIL, maar
# levert geen bewijsregel voor de acceptatielijst — hij bewijst dat de groep kán afwijken.
tegen() { _C_GROEP_TEGEN=$((_C_GROEP_TEGEN + 1)); _rij "$1" "$2" "$3" "$4" tegen; }

rapport() {
  _sluit_groep
  local n=$((_C_PASS + _C_FAIL + _C_ONBE))
  printf '\n  %d PASS · %d FAIL · %d niet te meten   (noemer: %d checks)\n' \
    "$_C_PASS" "$_C_FAIL" "$_C_ONBE" "$n"
  if [ "${#_C_BEWIJS[@]}" -gt 0 ]; then
    printf '\n  Voor de acceptatie-checklist:\n'
    printf '    %s\n' "${_C_BEWIJS[@]}"
  fi
  if [ -n "$_C_GEEN_TEGEN" ]; then
    printf '\n  ✗ groep(en) zonder tegenproef:%s — de ronde bewijst daar niets.\n' "$_C_GEEN_TEGEN"
    return 2
  fi
  [ "$n" -eq 0 ] && { printf '\n  ✗ nul checks gedraaid — een lege ronde is geen groene ronde.\n'; return 2; }
  [ "$_C_ECHT" -eq 0 ] && { printf '\n  ✗ geen enkel acceptatie-item leverde een uitkomst — alleen tegenproeven en/of ??.\n'; return 2; }
  [ "$_C_FAIL" -gt 0 ] && return 1
  return 0
}
