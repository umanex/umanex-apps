import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@umanex/ui/components/ui/badge';
import { GeenMeting } from '@/components/cockpit/GeenMeting';
import { LusRegel } from '@/components/cockpit/LusRegel';
import { Meetstempel } from '@/components/cockpit/Meetstempel';
import { SchuldBalk } from '@/components/cockpit/SchuldBalk';
import { leesBriefings, leesDebt, leesIndex, leesWerkvoorraad } from '@/lib/stand/lezen';
import { klantBySlug } from '@/lib/stand/registry';
import { verificatieschuld } from '@/lib/standRegels.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'outline'> = {
  gevalideerd: 'success',
  gebouwd: 'secondary',
  gepland: 'outline',
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ klant: string; project: string }>;
}) {
  const { klant: slug, project: ruwProject } = await params;
  const project = decodeURIComponent(ruwProject);
  const klant = klantBySlug(slug);
  if (!klant) notFound();

  const index = leesIndex(slug);
  if (index.staat === 'ontbreekt') {
    return (
      <main>
        <h1 className="text-2xl font-semibold tracking-tight">{project}</h1>
        <GeenMeting reden={index.reden} zet={`pnpm --filter dashboard cockpit:collect ${slug}`} />
      </main>
    );
  }

  // Bestaat dit project in de meting? Zo niet is dat een 404 en geen leeg scherm: een
  // typefout in de URL hoort niet als "alles klaar hier" te lezen.
  const rij = index.signaal.data.find((p) => p.project === project);
  if (!rij) notFound();

  const werk = leesWerkvoorraad(slug);
  const briefings = leesBriefings(slug);
  const debt = leesDebt(slug);

  const werkRijen = (werk.staat === 'ontbreekt' ? [] : werk.signaal.data)
    .filter((r) => r.project === project)
    .sort((a, b) => b.leeftijd - a.leeftijd);
  const briefingRijen = (briefings.staat === 'ontbreekt' ? [] : briefings.signaal.data)
    .filter((b) => b.project === project)
    .sort((a, b) => b.datum.localeCompare(a.datum));
  const debtRijen = (debt.staat === 'ontbreekt' ? [] : debt.signaal.data)
    .filter((d) => d.project === project)
    .sort((a, b) => b.aantal - a.aantal);
  const schuld = verificatieschuld(briefingRijen);
  const metCheck = werkRijen.filter((r) => r.check !== '').length;

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link
              href={`/cockpit/${slug}`}
              className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {klant.naam}
            </Link>
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{project}</h1>
        </div>
        <Meetstempel moment={index.signaal.measured_at} dagen={index.dagen} staat={index.staat} />
      </div>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-semibold tracking-tight">
          Open werk <span className="font-normal text-muted-foreground">({werkRijen.length})</span>
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {rij.handoff} handoff · {rij.backlog} backlog · {rij.learnings} learnings.{' '}
          {metCheck} van {werkRijen.length} draagt een uitvoerbare check.
        </p>
        {werkRijen.length === 0 ? (
          <GeenMeting reden="geen open items in dit project" />
        ) : (
          <ul className="rounded-md border border-border px-4">
            {werkRijen.map((r) => (
              <LusRegel
                key={`${r.bestand}:${r.datum}:${r.titel}`}
                rij={r}
                klant={slug}
                checksToegestaan
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-semibold tracking-tight">
          Briefings <span className="font-normal text-muted-foreground">({briefingRijen.length})</span>
        </h2>
        {briefingRijen.length === 0 ? (
          <GeenMeting reden="geen briefings in dit project" />
        ) : (
          <>
            <div className="mb-3 rounded-md border border-border p-4">
              <SchuldBalk
                metBewijs={schuld.met_bewijs}
                zonderBewijs={schuld.zonder_bewijs}
                open={schuld.open}
              />
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Datum</th>
                    <th className="px-3 py-2 font-medium">Briefing</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Met bewijs</th>
                    <th className="px-3 py-2 text-right font-medium">Zonder</th>
                    <th className="px-3 py-2 text-right font-medium">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {briefingRijen.map((b) => (
                    <tr key={b.bestand} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs">{b.datum}</td>
                      <td className="px-3 py-2">
                        {b.naam}
                        {b.soort ? (
                          <span className="ml-2 text-xs text-muted-foreground">{b.soort}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={STATUS_VARIANT[b.status] ?? 'outline'}
                          className="font-normal"
                        >
                          {b.status === '' ? 'geen status' : b.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.af_met_bewijs}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.af_zonder_bewijs}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.open}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold tracking-tight">Design-debt</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          svg-markup en <span className="font-mono">var(--token, #fallback)</span> staan buiten het
          totaal: een ingebed logo hoort zijn eigen merkkleur te dragen, en een hex achter een
          gebonden token is een vangnet.
        </p>
        {debtRijen.length === 0 ? (
          <GeenMeting reden="geen treffers in dit project — of het project valt buiten het meetbereik" />
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {debtRijen.slice(0, 25).map((d) => (
              <li
                key={`${d.patroon}:${d.bestand}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-mono text-xs">{d.bestand}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={d.patroon === 'svg' || d.patroon === 'fallback' ? 'outline' : 'secondary'}
                    className="font-normal"
                  >
                    {d.patroon}
                  </Badge>
                  <span className="tabular-nums">{d.aantal}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
