import { families, trackings, typeScale, weights } from '../lib/tokenCatalog';
import { code, muted, table, td, th } from '../lib/docsStyles';

const SAMPLE = 'De snelle bruine vos springt over de luie hond';

/** De typografie-schaal uit de tokens, elk met een voorbeeldregel in de rol-font. */
export const TypeScale = () => (
  <>
    <table style={table}>
      <thead>
        <tr>
          <th style={th}>Token</th>
          <th style={th}>Utility</th>
          <th style={th}>Waarde</th>
        </tr>
      </thead>
      <tbody>
        {families.map((f) => (
          <tr key={f.key}>
            <td style={td}><code style={code}>{f.path}</code></td>
            <td style={td}><code style={code}>font-{f.key}</code></td>
            <td style={td}><span className={`font-${f.key}`}>{f.value}</span></td>
          </tr>
        ))}
      </tbody>
    </table>

    <table style={table}>
      <thead>
        <tr>
          <th style={th}>Token</th>
          <th style={th}>Utility</th>
          <th style={th}>Size / leading</th>
          <th style={{ ...th, width: '55%' }}>Voorbeeld</th>
        </tr>
      </thead>
      <tbody>
        {typeScale.map((step) => (
          <tr key={step.key}>
            <td style={td}>
              <code style={code}>{step.path}</code>
              <div style={{ ...muted, fontSize: '0.7rem' }}>font.leading.{step.key}</div>
            </td>
            <td style={td}><code style={code}>text-{step.key}</code></td>
            <td style={td}><code style={code}>{step.size} / {step.lineHeight}</code></td>
            <td style={{ ...td, fontFamily: 'var(--font-sans, ui-sans-serif)' }}>
              <span style={{ fontSize: step.size, lineHeight: step.lineHeight, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {SAMPLE}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <table style={table}>
      <thead>
        <tr>
          <th style={th}>Token</th>
          <th style={th}>Utility</th>
          <th style={th}>Waarde</th>
          <th style={{ ...th, width: '55%' }}>Voorbeeld</th>
        </tr>
      </thead>
      <tbody>
        {weights.map((w) => (
          <tr key={w.key}>
            <td style={td}><code style={code}>{w.path}</code></td>
            <td style={td}><code style={code}>font-{w.key}</code></td>
            <td style={td}><code style={code}>{w.value}</code></td>
            <td style={{ ...td, fontFamily: 'var(--font-sans, ui-sans-serif)', fontWeight: Number(w.value) }}>{SAMPLE}</td>
          </tr>
        ))}
        {trackings.map((t) => (
          <tr key={t.key}>
            <td style={td}><code style={code}>{t.path}</code></td>
            <td style={td}><code style={code}>tracking-{t.key}</code></td>
            <td style={td}><code style={code}>{t.value}</code></td>
            <td style={{ ...td, fontFamily: 'var(--font-sans, ui-sans-serif)', letterSpacing: t.value }}>{SAMPLE}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
);
