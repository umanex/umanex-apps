import type { VoortgangGroep } from '@/lib/plan/types'

type VoortgangProps = {
  groepen: VoortgangGroep[]
}

/**
 * Voortgang per prioriteitsgroep.
 *
 * Een telling, geen score. Elk segment is precies één actie breed, want A01 afbakenen en A14
 * cashplanning zijn niet even zwaar — en een percentage zou precies dat beweren. Daarom staat
 * het woord "ongewogen" in de voetnoot en staat er nergens een procentteken.
 *
 * De inzet draagt zijn noemer mee: "40 u bekend" zonder "en 6 onbekend" is een som die
 * completer oogt dan hij is.
 */
export function VoortgangPerPrioriteit({ groepen }: VoortgangProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Voortgang per prioriteit</h3>
      <ol className="space-y-3">
        {groepen.map((g) => {
          const rest = Math.max(
            0,
            g.totaal - g.perStatus.gereed - g.perStatus.bezig - g.perStatus.wacht_op_input
          )
          return (
            <li key={g.prioriteit} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {g.prioriteit}. {g.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {g.perStatus.gereed} van {g.totaal} gereed
                </span>
              </div>
              <div aria-hidden className="flex h-2 w-full overflow-hidden rounded-sm bg-muted">
                {g.perStatus.gereed > 0 && (
                  <span className="bg-success" style={{ flexGrow: g.perStatus.gereed }} />
                )}
                {g.perStatus.bezig > 0 && (
                  <span className="bg-primary" style={{ flexGrow: g.perStatus.bezig }} />
                )}
                {g.perStatus.wacht_op_input > 0 && (
                  <span className="bg-warning" style={{ flexGrow: g.perStatus.wacht_op_input }} />
                )}
                {rest > 0 && <span style={{ flexGrow: rest }} />}
              </div>
              {/* Alleen wat er ís. Een rij "0 gereed · 0 bezig · 0 geblokkeerd · 0
                  beschikbaar · 5 uitgesteld" laat je vier nullen lezen om bij het enige
                  getal te komen dat iets zegt. */}
              <p className="text-xs tabular-nums text-muted-foreground">
                {[
                  g.perStatus.gereed > 0 && `${g.perStatus.gereed} gereed`,
                  g.perStatus.bezig > 0 && `${g.perStatus.bezig} bezig`,
                  g.perStatus.wacht_op_input > 0 && `${g.perStatus.wacht_op_input} wacht op input`,
                  g.geblokkeerd > 0 && `${g.geblokkeerd} geblokkeerd`,
                  g.beschikbaar > 0 && `${g.beschikbaar} beschikbaar`,
                  g.perStatus.uitgesteld > 0 && `${g.perStatus.uitgesteld} uitgesteld`,
                  g.perStatus.vervallen > 0 && `${g.perStatus.vervallen} vervallen`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                {' — inzet '}
                {g.inzet.bekendUren} u bekend, {g.inzet.aantalOnbekend} onbekend
              </p>
            </li>
          )
        })}
      </ol>
      <p className="text-2xs text-muted-foreground">
        Aantal acties, ongewogen. Dit telt afgeronde acties — of je kan starten staat hieronder
        bij de startvoorwaarden.
      </p>
    </section>
  )
}
