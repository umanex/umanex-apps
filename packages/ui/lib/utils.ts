import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { layoutRoleUtilities } from "@umanex/tokens/roles";
import { fontSize } from "@umanex/tokens/typography";

// tailwind-merge kent alleen Tailwinds eigen spacing-waarden. Zonder deze uitbreiding
// ziet hij p-surface niet als padding, en houdt cn("p-surface", "p-4") beide klassen:
// de className van de consument wint dan niet meer, en welke klasse het haalt hangt af
// van de volgorde in de stylesheet.
//
// Dezelfde redenering geldt één laag dieper voor de TYPESCHAAL, en daar is de uitkomst
// erger. tailwind-merge herkent een `text-*`-klasse als grootte wanneer de waarde een
// t-shirtmaat is; wat daar niet op lijkt belandt in de kleurgroep. `dense` is de enige
// stap in de schaal met een gewone naam, dus `text-dense` gold als kleur — en
// cn("text-primary-foreground", "text-dense") gaf enkel `text-dense`: de voorgrondkleur
// werd stil weggemergd. Gemeten 2026-09-18 op de xs-knop: donkerblauw op merkrood,
// 3,34:1 waar 4,5:1 nodig is; de contrast-sweep van cashflow ving het in CI.
// De sleutels komen uit de tokenbuild, zodat een nieuwe stap met een gewone naam
// (`compact`, `tight`) hier niet opnieuw stil de kleur opeet.
const twMerge = extendTailwindMerge({
  extend: {
    theme: { spacing: Object.keys(layoutRoleUtilities) },
    classGroups: { "font-size": [{ text: Object.keys(fontSize) }] },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
