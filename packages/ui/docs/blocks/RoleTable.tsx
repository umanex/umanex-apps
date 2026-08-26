import { cssColor, type ColorRole } from '../lib/tokenCatalog';
import { code, muted, table, td, th } from '../lib/docsStyles';
import { Swatch } from './Swatch';

// Een representatieve utility per rol: tekstrollen als text-, randen als border-,
// focus-ringen als ring-, de rest als vlak. Elke rol heeft álle prefixen (bg-, text-,
// border-, ring-…); dit is alleen het voorbeeld dat in de apps het vaakst voorkomt.
function exampleUtility(name: string): string {
  if (name === 'foreground' || name.endsWith('-foreground') || name.startsWith('finance-')) return `text-${name}`;
  if (name === 'border' || name === 'input' || name.endsWith('-border')) return `border-${name}`;
  if (name === 'ring' || name.endsWith('-ring')) return `ring-${name}`;
  return `bg-${name}`;
}

type Props = {
  roles: ColorRole[];
};

/** De kleurrollen als tabel: pad, primitive-referentie en waarde per mode, CSS-variabele. */
export const RoleTable = ({ roles }: Props) => (
  <table style={table}>
    <thead>
      <tr>
        <th style={th}>Token</th>
        <th style={th}>Light</th>
        <th style={th}>Dark</th>
        <th style={th}>CSS</th>
        <th style={th}>Utility</th>
      </tr>
    </thead>
    <tbody>
      {roles.map((role) => (
        <tr key={role.name}>
          <td style={td}>
            <code style={code}>{role.path}</code>
            <div style={{ ...muted, fontSize: '0.7rem' }}>{role.group}</div>
          </td>
          <td style={td}>
            <Swatch color={cssColor(role, 'light')} label={role.ref.light} />
          </td>
          <td style={td}>
            <Swatch color={cssColor(role, 'dark')} label={role.ref.dark} />
          </td>
          <td style={td}>
            <code style={code}>--{role.name}</code>
          </td>
          <td style={td}>
            <code style={code}>{exampleUtility(role.name)}</code>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
