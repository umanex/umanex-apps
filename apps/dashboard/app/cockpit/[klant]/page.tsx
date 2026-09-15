import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@umanex/ui/components/ui/badge';
import { GeenMeting } from '@/components/cockpit/GeenMeting';
import { LusRegel } from '@/components/cockpit/LusRegel';
import { Meetstempel } from '@/components/cockpit/Meetstempel';
import { SchuldBalk } from '@/components/cockpit/SchuldBalk';
import { Tegel } from '@/components/cockpit/Tegel';
import { leesBriefings, leesDebt, leesIndex, leesLaag, leesWerkvoorraad } from '@/lib/stand/lezen';
import { klantBySlug } from '@/lib/stand/registry';
import { cohorten, verificatieschuld } from '@/lib/standRegels.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function KlantPage({ params }: { params: Promise<{ klant: string }> }) {
  const { klant: slug } = await params;
  const klant = klantBySlug(slug);
  // 404 en niet 403: een onbekende slug hoort niet te verraden of hij bestaat maar
  // afgeschermd is. Dat is hier nog een detail, maar het is de vorm die de klant-app nodig
  // heeft en die je niet achteraf inbouwt.
  if (!klant) notFound();

  const index = leesIndex(slug);
  const werk = leesWerkvoorraad(slug);
  const briefings = leesBriefings(slug);
  const debt = leesDebt(slug);
  const laag = leesLaag(slug);

  if (index.staat === 'ontbreekt') {
    return (
      <main>
        <h1 className="text-2xl font-semibold tracking-tight">{klant.naam}</h1>
        <p className="mb-6 mt-1 font-mono text-xs text-muted-foreground">{klant.repo}</p>
        <GeenMeting
          reden={index.reden}
          zet={`pnpm --filter dashboard cockpit:collect ${slug}`}
        />
      </main>
    );
  }

  const projecten = [...index.signaal.data].sort((a, b) => a.project.localeCompare(b.project));
  const werkRijen = werk.staat === 'ontbreekt' ? [] : werk.signaal.data;
  const briefingRijen = briefings.staat === 'ontbreekt' ? [] : briefings.signaal.data;
  const schuld = verificatieschuld(briefingRijen);
  const coh = cohorten(briefingRijen);
  const debtRijen = debt.staat === 'ontbreekt' ? [] : debt.signaal.data;
  // Drie uitkomsten, niet twee. Een ontbrekend bestand betekent "nooit gemeten"; een
  // aanwezig bestand met `meetbaar: false` betekent "deze repo heeft geen .tsx onder apps/".
  // Ze allebei als een em-dash met dezelfde voetnoot tonen is `null ≠ 0` half toepassen:
  // je toont geen nul, maar wel een verklaring die niet klopt.
  const debtOntbreekt = debt.staat === 'ontbreekt';
  const debtMeetbaar = !debtOntbreekt && debt.signaal.noemer.meetbaar === true;
  const debtReden = debtOntbreekt
    ? `niet gemeten — ${debt.reden}`
    : 'geen .tsx onder apps/';
  const laagRijen = laag.staat === 'ontbreekt' ? [] : laag.signaal.data;
  const laagStuk = laagRijen.filter((r) => r.status === 'afwijkend' || r.status === 'ontbreekt');

  // De oudste eerst: een item van 200 dagen is een ander gesprek dan een van gisteren.
  const oudsteEerst = [...werkRijen].sort((a, b) => b.leeftijd - a.leeftijd);

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{klant.naam}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">{klant.repo}</span>
            <span className="font-mono">{index.signaal.bron.branch}</span>
            <span className="font-mono">{index.signaal.bron.commit}</span>
          </p>
        </div>
        <Meetstempel moment={index.signaal.measured_at} dagen={index.dagen} staat={index.staat} />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          Projecten <span className="font-normal text-muted-foreground">({projecten.length})</span>
        </h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Project</th>
                <th className="px-3 py-2 text-right font-medium">Handoff</th>
                <th className="px-3 py-2 text-right font-medium">Backlog</th>
                <th className="px-3 py-2 text-right font-medium">Learnings</th>
                <th className="px-3 py-2 text-right font-medium">Briefings</th>
                <th className="px-3 py-2 text-right font-medium">Gevalideerd</th>
                <th className="px-3 py-2 text-right font-medium">Zonder bewijs</th>
                <th className="px-3 py-2 text-right font-medium">Debt</th>
              </tr>
            </thead>
            <tbody>
              {projecten.map((p) => (
                <tr key={p.project} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/cockpit/${slug}/${encodeURIComponent(p.project)}`}
                      className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {p.project}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.handoff}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.backlog}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.learnings}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.briefings}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {p.gevalideerd}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.af_zonder_bewijs}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {debtMeetbaar ? p.debt_hex + p.debt_arb_px + p.debt_inline_px : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="briefings" className="mb-8 scroll-mt-6">
        <h2 className="mb-1 text-sm font-semibold tracking-tight">Verificatieschuld</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Per contract telt een vinkje zonder <span className="font-mono">bewijs:</span>-regel als
          open. Een deel daarvan dateert van vóór die conventie ({coh.vanaf}), dus de twee cohorten
          staan apart — anders is het één getal dat niemand kan verkleinen.
        </p>
        {briefingRijen.length === 0 ? (
          <GeenMeting reden="geen briefings gemeten voor deze klant" />
        ) : (
          <div className="space-y-4 rounded-md border border-border p-4">
            <SchuldBalk
              label={`Alle ${schuld.briefings} briefings`}
              metBewijs={schuld.met_bewijs}
              zonderBewijs={schuld.zonder_bewijs}
              open={schuld.open}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SchuldBalk
                label={`Vóór ${coh.vanaf} — ${coh.voor.briefings} briefings`}
                metBewijs={coh.voor.met_bewijs}
                zonderBewijs={coh.voor.zonder_bewijs}
                open={coh.voor.open}
              />
              <SchuldBalk
                label={`Vanaf ${coh.vanaf} — ${coh.na.briefings} briefings`}
                metBewijs={coh.na.met_bewijs}
                zonderBewijs={coh.na.zonder_bewijs}
                open={coh.na.open}
              />
            </div>
          </div>
        )}
      </section>

      <section id="debt" className="mb-8 grid gap-3 scroll-mt-6 sm:grid-cols-3">
        <Tegel
          label="Design-debt"
          waarde={debtMeetbaar ? Number(debt.signaal.noemer.totaal ?? 0) : null}
          noemer={debtMeetbaar ? 'hex + arbitrary-px + inline-px' : debtReden}
        />
        <Tegel
          label="Buiten het totaal"
          waarde={
            debtMeetbaar
              ? Number(debt.signaal.noemer.svg_buiten_totaal ?? 0) +
                Number(debt.signaal.noemer.fallback_buiten_totaal ?? 0)
              : null
          }
          noemer="svg-markup en token-fallbacks"
        />
        <Tegel
          label="Laag-drift"
          waarde={laagRijen.length === 0 ? null : laagStuk.length}
          noemer={`van ${laagRijen.length} canon-rijen`}
          href="/cockpit/systeem"
          toon={laagStuk.length > 0 ? 'waarschuwing' : 'neutraal'}
        />
      </section>

      <section id="werkvoorraad" className="scroll-mt-6">
        <h2 className="mb-1 text-sm font-semibold tracking-tight">
          Open werk{' '}
          <span className="font-normal text-muted-foreground">({werkRijen.length}, oudste eerst)</span>
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {werkRijen.filter((r) => r.check !== '').length} van {werkRijen.length} dragen een
          uitvoerbaar <span className="font-mono">Check</span>-commando. Draaien doe je per item —
          nooit automatisch, en het commando staat er zichtbaar bij.
        </p>
        {werkRijen.length === 0 ? (
          <GeenMeting reden="geen open items gemeten voor deze klant" />
        ) : (
          <ul className="rounded-md border border-border px-4">
            {oudsteEerst.slice(0, 40).map((r) => (
              <LusRegel
                key={`${r.bestand}:${r.datum}:${r.titel}`}
                rij={r}
                klant={slug}
                // Lokaal mag dit: de app bindt op loopback en weigert elke vreemde
                // Host-header. Het is een prop en geen constante omdat het klant-oppervlak
                // van fase 1 hem op false zet — daar draait nooit shell.
                checksToegestaan
              />
            ))}
          </ul>
        )}
        {oudsteEerst.length > 40 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            … en {oudsteEerst.length - 40} jongere items. Open een project om zijn eigen lijst te
            zien.
          </p>
        ) : null}
      </section>

      {werk.staat === 'verouderd' || index.staat === 'verouderd' ? (
        <p className="mt-6 text-xs text-muted-foreground">
          <Badge variant="warning" className="mr-2 font-normal">
            verouderd
          </Badge>
          Deze meting is ouder dan {index.signaal.verouderd_na_dagen} dagen. De getallen kloppen
          met het moment van meten, niet met nu.
        </p>
      ) : null}
    </main>
  );
}
