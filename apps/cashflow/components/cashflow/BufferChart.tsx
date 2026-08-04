'use client';

import { useState } from 'react';
import { formatAmount, formatCurrency, getMonthLabel } from '../../lib/cashflow/recurring';
import { TREND_THRESHOLD, type BufferPoint } from '../../lib/cashflow/analysis';

type BufferChartProps = {
  points: BufferPoint[];
  closedMonths: number;
};

// Vaste tekenruimte; de SVG schaalt mee via viewBox, dus de verhoudingen blijven kloppen.
const W = 640;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 76 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Korte maandaanduiding voor de as: "aug 26". */
function shortLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return `${date.toLocaleDateString('nl-BE', { month: 'short' })} ${year?.slice(2)}`;
}

/** Ronde bovengrens, zodat de as op leesbare bedragen eindigt. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export function BufferChart({ points, closedMonths }: BufferChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (closedMonths < TREND_THRESHOLD) {
    const nog = TREND_THRESHOLD - closedMonths;
    return (
      <section className="rounded-xl border border-[var(--umanexPrimary50)] bg-card p-5">
        <h2 className="text-base font-semibold text-[var(--umanexNeutral800)]">Bufferopbouw</h2>
        <p className="mt-2 text-sm text-[var(--umanexNeutral500)]">
          Nog {nog} {nog === 1 ? 'afgesloten maand' : 'afgesloten maanden'} nodig. Tot dan is
          er te weinig historie om een opbouw uit af te lezen.
        </p>
      </section>
    );
  }

  // De y-as begint altijd op nul: een afgekapte as dramatiseert kleine bewegingen.
  const maxValue = niceMax(Math.max(...points.map((p) => p.buffer), 0));
  const stepX = points.length > 1 ? PLOT_W / (points.length - 1) : 0;
  const x = (i: number) => PAD.left + i * stepX;
  const y = (value: number) => PAD.top + PLOT_H - (value / maxValue) * PLOT_H;

  const lastHistoryIndex = points.reduce((last, p, i) => (p.isForecast ? last : i), -1);
  // Het grenspunt hoort bij beide lijnen, anders valt er een gat tussen historie en prognose.
  const historyPoints = points.slice(0, lastHistoryIndex + 1);
  const forecastPoints = points.slice(Math.max(lastHistoryIndex, 0));

  const line = (subset: BufferPoint[], offset: number) =>
    subset.map((p, i) => `${x(i + offset)},${y(p.buffer)}`).join(' ');

  const areaPath =
    historyPoints.length > 0
      ? `M ${x(0)},${y(0)} L ${historyPoints.map((p, i) => `${x(i)},${y(p.buffer)}`).join(' L ')} L ${x(historyPoints.length - 1)},${y(0)} Z`
      : '';

  const ticks = [0, maxValue / 2, maxValue];

  return (
    <section className="rounded-xl border border-[var(--umanexPrimary50)] bg-card p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--umanexNeutral800)]">Bufferopbouw</h2>
          <p className="text-sm text-[var(--umanexNeutral500)]">
            Stand van je bufferpot per maand — doorlopend is historie, gestippeld is prognose
          </p>
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="shrink-0 h-8 px-3 rounded-md border border-input text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showTable ? 'Verberg tabel' : 'Toon tabel'}
        </button>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full h-auto"
        role="img"
        aria-label={`Bufferopbouw van ${getMonthLabel(points[0]?.monthKey ?? '')} tot ${getMonthLabel(points[points.length - 1]?.monthKey ?? '')}. De tabel eronder bevat dezelfde waarden.`}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--umanexNeutral200)"
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--umanexNeutral500)"
            >
              {formatCurrency(tick)}
            </text>
          </g>
        ))}

        {/* Nullijn expliciet, iets zwaarder dan de rasterlijnen. */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--umanexNeutral400)"
        />

        {areaPath && <path d={areaPath} fill="var(--umanexNeutral200)" />}

        {historyPoints.length > 1 && (
          <polyline
            points={line(historyPoints, 0)}
            fill="none"
            stroke="var(--umanexNeutral800)"
            strokeWidth={2}
          />
        )}

        {forecastPoints.length > 1 && (
          <>
            {/* Grens tussen wat vastligt en wat verwacht wordt. */}
            <line
              x1={x(Math.max(lastHistoryIndex, 0))}
              x2={x(Math.max(lastHistoryIndex, 0))}
              y1={PAD.top}
              y2={y(0)}
              stroke="var(--umanexNeutral400)"
              strokeDasharray="3 3"
            />
            <polyline
              points={line(forecastPoints, Math.max(lastHistoryIndex, 0))}
              fill="none"
              stroke="var(--umanexNeutral500)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          </>
        )}

        {points.map((p, i) => (
          <circle
            key={p.monthKey}
            cx={x(i)}
            cy={y(p.buffer)}
            r={3}
            // Open markers voor de toekomst: ongevulde punten versterken de onzekerheid.
            fill={p.isForecast ? 'var(--umanexBaseWhite)' : 'var(--umanexNeutral800)'}
            stroke={p.isForecast ? 'var(--umanexNeutral500)' : 'none'}
          />
        ))}

        {points.map((p, i) => (
          <text
            key={p.monthKey}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={11}
            fill="var(--umanexNeutral500)"
          >
            {shortLabel(p.monthKey)}
          </text>
        ))}
      </svg>

      {showTable && (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Bufferstand per maand</caption>
          <thead>
            <tr className="text-left text-[var(--umanexNeutral500)]">
              <th scope="col" className="font-medium py-1">Maand</th>
              <th scope="col" className="font-medium py-1">Bufferstand</th>
              <th scope="col" className="font-medium py-1">Bron</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.monthKey} className="border-t border-[var(--umanexNeutral200)]">
                <td className="py-1">{getMonthLabel(p.monthKey)}</td>
                <td className="py-1 tabular-nums">{formatAmount(p.buffer)}</td>
                <td className="py-1 text-[var(--umanexNeutral500)]">
                  {p.isForecast ? 'prognose' : 'afgesloten'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
