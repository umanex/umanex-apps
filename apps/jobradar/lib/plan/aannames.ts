/**
 * De planningsaannames achter het aanbod: dagen, rekenprijzen en de eerste doelgroep.
 *
 * Bewust één bewerkbare tekst en geen model met velden. Deze getallen zijn **voorlopig** —
 * ze moeten nog getoetst worden — en een tabel met kolommen nodigt uit tot rekenen ermee.
 * Zodra de app een prijs zou afleiden uit een ongetoetst getal, is de aanname een systeemregel
 * geworden en kan niets haar nog tegenspreken. Als tekst blijft ze wat ze is: een notitie om
 * naast je offerte te leggen.
 *
 * Regime zoals `zoekopdracht`: geen rij in `settings` betekent "de standaard", en herstellen
 * gebeurt door de rij te verwijderen, niet door deze tekst terug te schrijven.
 */
export const STANDAARD_AANNAMES = `Voorlopige rekenprijzen — nog te toetsen, alle bedragen exclusief btw.

  Productdiagnose      6 dagen   € 10.000
  Conceptvalidatie    14 dagen   € 23.000
  Workflowtraject     22 dagen   € 36.000
  Design system       31 dagen   € 49.000

Het design system is zelfstandig te koop. Standaard gebruikt het Figma, Tokens Studio, shadcn,
Storybook en de bestaande Style Dictionary-integratie met de transformers uit umanex-os. Een
andere componentlibrary vraagt afzonderlijke ontwikkeling en een eigen begroting.

Eerste prospectiedoelgroep: Vlaamse B2B-software met actieve ontwikkeling. Voorkeur 20–150
medewerkers en, waar bekend, € 3–30 miljoen omzet. Dit zijn zachte filters: een ontbrekende
omzet is geen nulomzet en geen reden tot uitsluiting.`
