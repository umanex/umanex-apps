import { cssColor } from '../lib/tokenCatalog';
import type { TokenUse } from '../lib/tokensFromSource';
import { code, muted, table, td, th } from '../lib/docsStyles';
import { Swatch } from './Swatch';

type Props = {
  uses: TokenUse[];
};

const KIND_LABEL: Record<TokenUse['kind'], string> = {
  color: 'Kleur',
  radius: 'Radius',
  typography: 'Typografie',
};

/** Per component: welke tokens hij raakt, via welke utilities, met de waarde per mode. */
export const TokenUseTable = ({ uses }: Props) => (
  <table style={table}>
    <thead>
      <tr>
        <th style={th}>Token</th>
        <th style={th}>Gebruikt als</th>
        <th style={th}>Light</th>
        <th style={th}>Dark</th>
      </tr>
    </thead>
    <tbody>
      {uses.map((use) => (
        <tr key={use.token}>
          <td style={td}>
            <code style={code}>{use.token}</code>
            <div style={{ ...muted, fontSize: '0.7rem' }}>
              {KIND_LABEL[use.kind]}
              {use.role ? ` · ${use.role.group}` : ''}
            </div>
          </td>
          <td style={td}>
            {use.utilities.map((u) => (
              <code key={u} style={{ ...code, display: 'block' }}>
                {u}
              </code>
            ))}
          </td>
          {use.role ? (
            <>
              <td style={td}>
                <Swatch color={cssColor(use.role, 'light')} label={use.role.ref.light} />
              </td>
              <td style={td}>
                <Swatch color={cssColor(use.role, 'dark')} label={use.role.ref.dark} />
              </td>
            </>
          ) : (
            <td style={td} colSpan={2}>
              <code style={code}>{use.value}</code>
            </td>
          )}
        </tr>
      ))}
    </tbody>
  </table>
);
