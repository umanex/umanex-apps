import { swatch } from '../lib/docsStyles';

type Props = {
  color: string;
  label?: string;
};

/** Eén kleurvlak met optioneel label ernaast; de kleur is een kant-en-klare CSS-waarde. */
export const Swatch = ({ color, label }: Props) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
    <span style={swatch(color)} aria-hidden="true" />
    {label ? <span>{label}</span> : null}
  </span>
);
