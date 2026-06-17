/**
 * Convert a hex color to a shadcn-style HSL triplet: "H S% L%"
 * (space-separated, NO commas, NO hsl() wrapper) so a Tailwind preset can wrap
 * it as `hsl(var(--token))` and opacity modifiers like `bg-primary/50` keep working.
 *
 * H is rounded to integer degrees, S and L to integer percent.
 *
 * @param {string} hex - "#RRGGBB" or "#RGB"
 * @returns {string} e.g. "#F05454" -> "0 84% 64%"
 */
export function hexToHslTriplet(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`hslTriplet: invalid hex "${hex}"`);

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  let s = 0;
  let hue = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: hue = ((g - b) / d) % 6; break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4; break;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
