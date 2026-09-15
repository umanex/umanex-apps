import { Badge } from '@umanex/ui/components/ui/badge';
import { GeenMeting } from '@/components/cockpit/GeenMeting';
import { Meetstempel } from '@/components/cockpit/Meetstempel';
import { leesDoctor, leesLaag } from '@/lib/stand/lezen';
import { leesRegistry } from '@/lib/stand/registry';
import type { DoctorRij, LaagRij } from '@/lib/stand/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  identiek: 'success',
  afwijkend: 'warning',
  ontbreekt: 'destructive',
  bron: 'outline',
  'n.v.t.': 'outline',
  ok: 'success',
  waarschuwing: 'warning',
  fout: 'destructive',
};

type RepoStand = {
  slug: string;
  naam: string;
  moment: string | null;
  dagen: number | null;
  staat: 'vers' | 'verouderd' | 'ontbreekt';
  laag: LaagRij[];
  doctorRepo: DoctorRij[];
  doctorMachine: DoctorRij[];
  reden: string | null;
};

export default function SysteemPage() {
  const registry = leesRegistry();

  const standen: RepoStand[] = registry.klanten.map((k) => {
    const laag = leesLaag(k.slug);
    const doctor = leesDoctor(k.slug);
    const doctorRijen = doctor.staat === 'ontbreekt' ? [] : doctor.signaal.data;
    return {
      slug: k.slug,
      naam: k.naam,
      moment: laag.staat === 'ontbreekt' ? null : laag.signaal.measured_at,
      dagen: laag.staat === 'ontbreekt' ? null : laag.dagen,
      staat: laag.staat,
      laag: laag.staat === 'ontbreekt' ? [] : laag.signaal.data,
      doctorRepo: doctorRijen.filter((r) => r.bereik === 'repo'),
      doctorMachine: doctorRijen.filter((r) => r.bereik === 'machine'),
      reden: laag.staat === 'ontbreekt' ? laag.reden : null,
    };
  });

  // De machine-blokken zijn per definitie voor élke repo hetzelfde — user-level hooks, de
  // werk-checkout, de cross-repo eval-loop. Ze één keer tonen in plaats van vier keer is
  // geen weglating: de collector schrijft ze per repo weg mét `bereik=machine`, juist zodat
  // ze telbaar blijven in plaats van stil te verdwijnen.
  const machine = standen.find((s) => s.doctorMachine.length > 0)?.doctorMachine ?? [];

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Systeem</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Draait elke repo de umanex-os van vandaag? De vergelijking loopt per rij uit{' '}
          <span className="font-mono">templates/canon.tsv</span> op inhoud, niet op een
          versienummer — dat bestaat niet, de versionering ís git.
        </p>
      </div>

      <section className="mb-8 space-y-4">
        {standen.map((s) => {
          const stuk = s.laag.filter((r) => r.status === 'afwijkend' || r.status === 'ontbreekt');
          return (
            <div key={s.slug} className="rounded-md border border-border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold">{s.naam}</h2>
                  {s.laag.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {s.laag.length - stuk.length} van {s.laag.length} canon-rijen in orde
                    </span>
                  ) : null}
                </div>
                <Meetstempel moment={s.moment} dagen={s.dagen} staat={s.staat} />
              </div>

              {s.laag.length === 0 ? (
                <div className="p-4">
                  <GeenMeting reden={s.reden ?? 'geen laag-meting'} />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {/* Eerst wat stuk is. Een lijst die met veertien groene regels begint, leest
                      niemand tot onderaan. */}
                  {[...stuk, ...s.laag.filter((r) => !stuk.includes(r))].map((r) => (
                    <li
                      key={r.pad}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate font-mono text-xs">{r.pad}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {r.detail ? (
                          <span className="text-xs text-muted-foreground">{r.detail}</span>
                        ) : null}
                        <Badge variant={STATUS_VARIANT[r.status] ?? 'outline'} className="font-normal">
                          {r.status}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {s.doctorRepo.length > 0 ? (
                <div className="border-t border-border px-4 py-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Doctor — {s.doctorRepo.filter((d) => d.status === 'ok').length} van{' '}
                    {s.doctorRepo.length} in orde
                  </p>
                  <ul className="space-y-1">
                    {s.doctorRepo
                      .filter((d) => d.status !== 'ok')
                      .map((d) => (
                        <li key={`${d.blok}:${d.tekst}`} className="flex items-start gap-2 text-xs">
                          <Badge variant={STATUS_VARIANT[d.status]} className="shrink-0 font-normal">
                            {d.status}
                          </Badge>
                          <span>
                            <span className="text-muted-foreground">{d.blok} — </span>
                            {d.tekst}
                          </span>
                        </li>
                      ))}
                    {s.doctorRepo.every((d) => d.status === 'ok') ? (
                      <li className="text-xs text-muted-foreground">geen bevindingen</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold tracking-tight">Deze machine</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Drie van doctors blokken meten niet de repo maar de machine: de user-level hooks, de
          skills in de werk-checkout, en de eval-loop over alle repo&rsquo;s heen. Ze zeggen onder elke
          klant hetzelfde, dus ze staan hier één keer — met een label in de meting, niet
          weggefilterd.
        </p>
        {machine.length === 0 ? (
          <GeenMeting reden="geen doctor-meting beschikbaar" />
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {machine.map((d) => (
              <li key={`${d.blok}:${d.tekst}`} className="flex items-start gap-2 px-4 py-2 text-xs">
                <Badge variant={STATUS_VARIANT[d.status]} className="shrink-0 font-normal">
                  {d.status}
                </Badge>
                <span>
                  <span className="text-muted-foreground">{d.blok} — </span>
                  {d.tekst}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
