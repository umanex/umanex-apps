import { colorRoles, type ColorRole } from '../lib/tokenCatalog';
import { RoleTable } from './RoleTable';

type Group = { title: string; match: (role: ColorRole) => boolean };

// Groepen op naam-prefix; wat nergens past valt in "Overige" zodat een nieuwe rol
// nooit stil uit het overzicht verdwijnt.
const GROUPS: Group[] = [
  { title: 'Oppervlakken en tekst', match: (r) => /^(background|foreground|card|popover)(-foreground)?$/.test(r.name) },
  { title: 'Merk en nadruk', match: (r) => /^(primary|secondary|accent|muted)(-foreground)?$/.test(r.name) },
  { title: 'Status', match: (r) => /^(destructive|success|warning)(-foreground)?$/.test(r.name) },
  { title: 'Randen en focus', match: (r) => /^(border|input|ring)$/.test(r.name) },
  { title: 'Chart', match: (r) => r.name.startsWith('chart-') },
  { title: 'Sidebar', match: (r) => r.name.startsWith('sidebar') },
  { title: 'Finance (Semantic)', match: (r) => r.name.startsWith('finance-') },
  { title: 'Overlay (Semantic)', match: (r) => r.name.startsWith('overlay-') },
];

/** Alle kleurrollen, gegroepeerd, met light/dark-waarde en primitive-referentie. */
export const ColorRoles = () => {
  const seen = new Set<string>();
  const sections = GROUPS.map((g) => {
    const roles = colorRoles.filter((r) => !seen.has(r.name) && g.match(r));
    roles.forEach((r) => seen.add(r.name));
    return { title: g.title, roles };
  });
  const rest = colorRoles.filter((r) => !seen.has(r.name));
  if (rest.length) sections.push({ title: 'Overige', roles: rest });

  return (
    <>
      {sections
        .filter((s) => s.roles.length)
        .map((s) => (
          <section key={s.title}>
            <h3>{s.title}</h3>
            <RoleTable roles={s.roles} />
          </section>
        ))}
    </>
  );
};
