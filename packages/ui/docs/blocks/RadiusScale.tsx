import { useEffect, useRef, useState } from 'react';
import { scalars } from '../lib/tokenCatalog';
import { code, muted, table, td, th } from '../lib/docsStyles';

const STEPS = ['sm', 'md', 'lg'] as const;

/**
 * De radius-rol en de drie afgeleide utilities. De afgeleide waarde wordt niet
 * overgeschreven uit de preset maar gemeten op het gerenderde element: dat is wat
 * Tailwind écht produceert, en het beweegt mee als de preset verandert.
 */
export const RadiusScale = () => {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [measured, setMeasured] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const step of STEPS) {
      const el = refs.current[step];
      if (el) next[step] = getComputedStyle(el).borderRadius;
    }
    setMeasured(next);
  }, []);

  return (
    <>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Token</th>
            <th style={th}>Set</th>
            <th style={th}>Waarde</th>
            <th style={th}>CSS</th>
          </tr>
        </thead>
        <tbody>
          {scalars.map((s) => (
            <tr key={s.name}>
              <td style={td}><code style={code}>{s.path}</code></td>
              <td style={td}>{s.set}</td>
              <td style={td}><code style={code}>{s.ref !== s.value ? `${s.ref} → ` : ""}{s.value}</code></td>
              <td style={td}><code style={code}>--{s.name}</code></td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Utility</th>
            <th style={th}>Gemeten</th>
            <th style={th}>Voorbeeld</th>
          </tr>
        </thead>
        <tbody>
          {STEPS.map((step) => (
            <tr key={step}>
              <td style={td}><code style={code}>rounded-{step}</code></td>
              <td style={td}><code style={code}>{measured[step] ?? '…'}</code></td>
              <td style={td}>
                <div
                  ref={(el) => {
                    refs.current[step] = el;
                  }}
                  className={`h-12 w-24 border border-border bg-muted rounded-${step}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={muted}>
        <code>rounded-full</code> en <code>rounded-none</code> zijn geen tokens; een arbitrary radius
        (<code>rounded-[…]</code>) blokkeert de guard.
      </p>
    </>
  );
};
