import type { StageChange } from '../../lib/bureau/types';
import { STAGE_LABEL } from '../../lib/bureau/labels';
import { dateLabel } from '../../lib/bureau/format';

/** De overgangen zoals ze vastgelegd zijn — alleen aangevuld, nooit herschreven. */
export function StageHistory({ history }: { history: StageChange[] }) {
  return (
    <ol className="space-y-1 text-sm">
      {history.map((h, i) => (
        <li key={`${h.stage}-${h.on}-${i}`} className="flex flex-wrap gap-x-3">
          <span className="w-36 shrink-0 tabular-nums text-muted-foreground">{dateLabel(h.on)}</span>
          <span>
            {STAGE_LABEL[h.stage]}
            {h.reason && <span className="text-muted-foreground"> — {h.reason}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
