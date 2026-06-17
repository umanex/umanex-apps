/**
 * Convert a hex color to a shadcn-style HSL triplet: "H S% L%"
 * (space-separated, NO commas, NO hsl() wrapper) so a Tailwind config can wrap it
 * as `hsl(var(--token))` and opacity modifiers like `bg-primary/50` keep working.
 *
 * H is integer degrees; S and L use the MINIMUM number of decimals (0-4) for which
 * hsl(H S% L%) round-trips to the exact source bytes. So #F05454 -> "0 83.9% 63.5%"
 * (renders back to #F05454), not the "0 84% 64%" / #F05656 you get from integer-only
 * rounding. Plain whole values stay clean: #FFFFFF -> "0 0% 100%".
 *
 * @param {string} hex - "#RRGGBB" or "#RGB"
 * @returns {string}
 */
export function hexToHslTriplet(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`hslTriplet: invalid hex "${hex}"`);

  const R = parseInt(h.slice(0, 2), 16);
  const G = parseInt(h.slice(2, 4), 16);
  const B = parseInt(h.slice(4, 6), 16);

  const r = R / 255, g = G / 255, b = B / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;

  let s = 0, hue = 0;
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

  const H = Math.round(hue);
  const sPct = s * 100, lPct = l * 100;

  for (let dec = 0; dec <= 4; dec++) {
    const S = roundTo(sPct, dec);
    const L = roundTo(lPct, dec);
    if (roundTripsTo(H, S, L, R, G, B)) return `${H} ${S}% ${L}%`;
  }
  // Fallback (should not happen for 8-bit colors): highest precision tried.
  return `${H} ${roundTo(sPct, 4)}% ${roundTo(lPct, 4)}%`;
}

// Round to `dec` decimals; Number drops trailing zeros so 84.0 -> "84", 100 -> "100".
function roundTo(value, dec) {
  const f = 10 ** dec;
  return Math.round(value * f) / f;
}

// Does hsl(h s% l%) reconstruct the exact source bytes? (standard HSL->RGB, 8-bit rounding)
function roundTripsTo(h, s, l, R, G, B) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return channel(0) === R && channel(8) === G && channel(4) === B;
}
