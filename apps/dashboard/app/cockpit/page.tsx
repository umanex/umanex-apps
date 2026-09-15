import { GeenMeting } from '@/components/cockpit/GeenMeting';
import { KlantKaart, type KlantSamenvatting } from '@/components/cockpit/KlantKaart';
import { leesBriefings, leesDebt, leesIndex, leesLaag, leesWerkvoorraad } from '@/lib/stand/lezen';
import { leesRegistry } from '@/lib/stand/registry';
import { telOp, verificatieschuld } from '@/lib/standRegels.mjs';

// Leest van schijf bij elk verzoek: de meting verandert zodra de collector draait, en een
// gecachete pagina zou een meetmoment tonen dat niet meer bij de inhoud hoort.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GROEPEN: { rol: KlantSamenvatting['rol']; kop: string; uitleg: string }[] = [
  { rol: 'eigen', kop: 'Eigen werk', uitleg: 'producten en sites onder het umanex-merk' },
  { rol: 'klant', kop: 'Klanten', uitleg: 'werk in de repo van de klant, met de laag erin' },
  { rol: 'systeem', kop: 'Systeem', uitleg: 'umanex-os zelf — de bron van de laag' },
];

function vatSamen(slug: string): KlantSamenvatting['meting'] | { reden: string } {
  const index = leesIndex(slug);
  if (index.staat === 'ontbreekt') return { reden: index.reden };

  const werk = leesWerkvoorraad(slug);
  const briefings = leesBriefings(slug);
  const laag = leesLaag(slug);
  const debt = leesDebt(slug);

  const schuld = briefings.staat === 'ontbreekt' ? null : verificatieschuld(briefings.signaal.data);
  const laagRijen = laag.staat === 'ontbreekt' ? [] : laag.signaal.data;

  return {
    moment: index.signaal.measured_at,
    dagen: index.dagen,
    staat: index.staat,
    projecten: index.signaal.data.length,
    openItems: werk.staat === 'ontbreekt' ? 0 : werk.signaal.data.length,
    // De noemer is het totaal aan entries in de drie lussen, niet het aantal open items —
    // anders leest "125 van 125" als voltooid werk in plaats van als achterstand.
    openNoemer:
      telOp(index.signaal.data, 'handoff') +
      telOp(index.signaal.data, 'backlog') +
      telOp(index.signaal.data, 'learnings'),
    briefings: briefings.staat === 'ontbreekt' ? 0 : briefings.signaal.data.length,
    zonderBewijs: schuld?.zonder_bewijs ?? 0,
    itemsTotaal: schuld?.items ?? 0,
    laagAfwijkend: laagRijen.filter((r) => r.status === 'afwijkend' || r.status === 'ontbreekt').length,
    laagRijen: laagRijen.length,
    debtMeetbaar: debt.staat !== 'ontbreekt' && debt.signaal.noemer.meetbaar === true,
    debtReden: debt.staat === 'ontbreekt' ? 'niet gemeten' : 'geen .tsx onder apps/',
    debtTotaal: debt.staat === 'ontbreekt' ? 0 : Number(debt.signaal.noemer.totaal ?? 0),
    debtBestanden:
      debt.staat === 'ontbreekt' ? 0 : Number(debt.signaal.noemer.bestanden_met_treffers ?? 0),
  };
}

export default function CockpitPage() {
  const registry = leesRegistry();

  const klanten: KlantSamenvatting[] = registry.klanten.map((k) => {
    const s = vatSamen(k.slug);
    const heeftMeting = s !== null && !('reden' in s);
    return {
      slug: k.slug,
      naam: k.naam,
      rol: k.rol,
      meting: heeftMeting ? (s as KlantSamenvatting['meting']) : null,
      reden: heeftMeting ? null : (s as { reden: string }).reden,
    };
  });

  const gemeten = klanten.filter((k) => k.meting !== null);
  const totaalOpen = gemeten.reduce((n, k) => n + (k.meting?.openItems ?? 0), 0);
  const totaalZonderBewijs = gemeten.reduce((n, k) => n + (k.meting?.zonderBewijs ?? 0), 0);

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Stand van het werk</h1>
        {gemeten.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Nog niets gemeten — {registry.klanten.length} klant(en) geregistreerd.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {totaalOpen} open items en {totaalZonderBewijs} afgevinkte acceptatie-items zonder
            bewijsregel, over {gemeten.length} van {klanten.length} gemeten klant(en). Elk getal
            hieronder klikt door naar de regels die het optellen.
          </p>
        )}
      </div>

      {registry.bezwaren.length > 0 ? (
        <div
          role="alert"
          className="mb-6 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
        >
          <p className="font-medium">De registry is niet compleet</p>
          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
            {registry.bezwaren.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {klanten.length === 0 ? (
        <GeenMeting
          reden="er staat nog geen registry op deze machine, dus er is niets om te tonen"
          zet="cp apps/dashboard/stand.local.example.json apps/dashboard/stand.local.json"
        />
      ) : (
        <div className="space-y-8">
          {GROEPEN.map(({ rol, kop, uitleg }) => {
            const groep = klanten.filter((k) => k.rol === rol);
            if (groep.length === 0) return null;
            return (
              <section key={rol}>
                <h2 className="text-sm font-semibold tracking-tight">{kop}</h2>
                <p className="mb-3 text-xs text-muted-foreground">{uitleg}</p>
                <div className="grid gap-3 lg:grid-cols-2">
                  {groep.map((k) => (
                    <KlantKaart key={k.slug} klant={k} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
