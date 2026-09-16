import { formatCurrency } from '../../lib/cashflow/recurring';
import type { Metric } from '../../lib/bureau/profitability';

type MetricValueProps = {
  metric: Metric;
  /** Toon de reden naast "Onvoldoende gegevens" (detail), of alleen het label (tabel). */
  showReason?: boolean;
};

/** Een bedrag per dag, of "Onvoldoende gegevens" — nooit een getal dat uit een ontbrekende noemer komt. */
export function MetricValue({ metric, showReason = false }: MetricValueProps) {
  if (metric.kind === 'ok') {
    return <span className="tabular-nums">{formatCurrency(metric.value)}/dag</span>;
  }
  return (
    <span className="text-muted-foreground" data-onvoldoende>
      Onvoldoende gegevens{showReason ? ` — ${metric.reason}` : ''}
    </span>
  );
}
