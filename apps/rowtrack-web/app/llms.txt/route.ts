import { absoluteUrl, site } from '@/lib/site';

// Statisch gerenderd bij de build: dit bestand verandert alleen wanneer de code
// verandert, en een route-handler die per verzoek draait zou een serverless
// invocatie kosten voor een tekstbestand.
export const dynamic = 'force-static';

/**
 * /llms.txt — een beknopte, citeerbare samenvatting voor taalmodellen.
 *
 * Behandel dit als een goedkope, redelijke investering en niet als een hefboom:
 * llms.txt is een opkomende conventie zonder breed aangetoond effect. De reden dat
 * het toch een ROUTE is en geen bestand in public/, is dat de prijzen en de App
 * Store-status uit lib/site.ts komen. Als statisch bestand zou dit de derde plek
 * zijn waar dezelfde feiten staan, en de eerste die niemand bijwerkt.
 *
 * Elke bewering hieronder staat in de waarheidstabel van de briefing. Juist hier
 * telt dat zwaar: wat een model overneemt, herhaalt het zonder de nuance eromheen.
 */
export function GET() {
  const { pricing } = site;

  const body = `# ${site.name}

> ${site.name} is een native iOS-app die roeitrainingen vastlegt. De app verbindt via Bluetooth (FTMS) met de Fluid Rower Apollo XL en toont live je split per 500 meter, vermogen in watt, slagfrequentie, afstand en tijd. Na afloop bewaart hij elke training met een splits-analyse.

## Feiten

- Platform: iOS. De app is nog niet in de App Store verschenen.
- Compatibiliteit: gemaakt voor de Fluid Rower Apollo XL. De app zoekt naar bluetooth-apparaten waarvan de naam met "Rower" begint; andere roeimachines zijn niet getest.
- Live metrics uit de roeier: split /500m, watt, slagfrequentie (spm), afstand, tijd, weerstandsniveau.
- Hartslag: komt van een losse bluetooth-hartslagband (BLE Heart Rate Service), niet van de roeimachine.
- Calorieën: berekend uit vermogen en lichaamsgewicht, niet uitgelezen uit de machine. Zonder ingevuld gewicht rekent de app met een standaardwaarde.
- Doelmodi: geen, duur, afstand, split of watt.
- Persoonlijke records: langste afstand en snelste 2000 meter.
- Apple Health: geen koppeling.
- Taal: Nederlands.
- Prijs: nog niet actief. Voorgenomen model: gratis basisgebruik, ${site.name} Pro voor € ${pricing.proMonthly} per maand of € ${pricing.proYearly} per jaar.
- Gegevens: opgeslagen bij Supabase in de EU (Frankfurt, eu-central-1). Geen advertenties, geen analysesoftware, geen verkoop van gegevens.
- Maker: ${site.organisation.name} (${site.organisation.city}, België).
- Onafhankelijk; niet gelieerd aan of goedgekeurd door Fluid Rower / FDF Ltd.

## Links

- Website: ${site.url}
- Support: ${absoluteUrl('/nl/support')}
`;

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
