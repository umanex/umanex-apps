import { useEffect, useRef, useState } from 'react';
import { borderScale, layoutRoles, spacingScale } from '../lib/tokenCatalog';
import { code, muted, table, td, th } from '../lib/docsStyles';

/**
 * De layout-laag: rollen bovenaan (wat een component gebruikt), de schaal eronder (waar de
 * rollen naar wijzen). De gemeten kolom leest wat de browser van de CSS-variabele maakt, niet
 * de catalogus: een rol die niet in theme.css landt, valt op als 0px.
 *
 * Bewust géén `p-${utility}` op het meetelement: Tailwind genereert alleen klassen die hij
 * letterlijk in de bron vindt, dus een samengestelde naam zou 0px meten voor elke rol die geen
 * component gebruikt.
 */
export const LayoutScale = () => {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [measured, setMeasured] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const role of layoutRoles) {
      const el = refs.current[role.name];
      if (!el) continue;
      next[role.name] = getComputedStyle(el).height;
    }
    setMeasured(next);
  }, []);

  return (
    <>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Rol</th>
            <th style={th}>Verwijst naar</th>
            <th style={th}>CSS</th>
            <th style={th}>Sleutel</th>
            <th style={th}>Gemeten</th>
          </tr>
        </thead>
        <tbody>
          {layoutRoles.map((role) => {
            return (
              <tr key={role.name}>
                <td style={td}><code style={code}>{role.path}</code></td>
                <td style={td}><code style={code}>{role.ref} → {role.value}</code></td>
                <td style={td}><code style={code}>--{role.name}</code></td>
                <td style={td}><code style={code}>{role.utility}</code></td>
                <td style={td}>
                  <code style={code}>{measured[role.name] ?? '…'}</code>
                  <div
                    ref={(el) => {
                      refs.current[role.name] = el;
                    }}
                    aria-hidden="true"
                    style={{ position: 'absolute', visibility: 'hidden', width: 0, height: `var(--${role.name})` }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p style={muted}>
        De sleutel werkt op elke spacing-utility: <code>p-surface</code>, <code>gap-inline</code>,{' '}
        <code>space-y-heading</code>, <code>h-control-md</code>, <code>w-control-md</code>.
      </p>

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Token</th>
            <th style={th}>Tailwind</th>
            <th style={th}>Waarde</th>
          </tr>
        </thead>
        <tbody>
          {spacingScale.map((step) => (
            <tr key={step.path}>
              <td style={td}><code style={code}>{step.path}</code></td>
              <td style={td}><code style={code}>p-{step.key}</code></td>
              <td style={td}><code style={code}>{step.value}</code></td>
            </tr>
          ))}
          {borderScale.map((step) => (
            <tr key={step.path}>
              <td style={td}><code style={code}>{step.path}</code></td>
              <td style={td}><code style={code}>{step.key === 'DEFAULT' ? 'border' : `border-${step.key}`}</code></td>
              <td style={td}><code style={code}>{step.value}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={muted}>
        Een arbitrary spacing (<code>p-[13px]</code>, <code>gap-[1.1rem]</code>) blokkeert de guard.
        Breedtes en hoogtes vallen daar buiten: die volgen de inhoud.
      </p>
    </>
  );
};
