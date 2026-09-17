import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { layoutRoleUtilities } from "@umanex/tokens/roles";

// tailwind-merge kent alleen Tailwinds eigen spacing-waarden. Zonder deze uitbreiding
// ziet hij p-surface niet als padding, en houdt cn("p-surface", "p-4") beide klassen:
// de className van de consument wint dan niet meer, en welke klasse het haalt hangt af
// van de volgorde in de stylesheet.
const twMerge = extendTailwindMerge({
  extend: { theme: { spacing: Object.keys(layoutRoleUtilities) } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
