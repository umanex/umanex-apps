import { GOAL_INPUT_BOUNDS } from './workout-goals';
import { t } from '@/i18n';

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatTimerFull(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Corrigeert + rondt een rauwe SPM-waarde af voor weergave. `halved` is de
 * per-profiel 'SPM halveren'-instelling (trainers die de slagfrequentie dubbel
 * tellen). Rauwe SPM wordt opgeslagen; de correctie gebeurt hier bij weergave
 * zodat álle historiek — oud én nieuw — consistent met de toggle meebeweegt.
 */
export function correctSpm(spm: number, halved: boolean): number {
  return Math.round(halved ? spm / 2 : spm);
}

/**
 * Duizendtal-groepering, zonder eenheid: 7515 -> '7.515', 850 -> '850'.
 * Samen met `formatDecimal` de enige plek waar een cijferscheider in code staat:
 * punt = duizendtal, komma = decimaal. Rondt af — groeperen op een float zou
 * '1.234.5' opleveren.
 */
export function formatInt(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, t.format.thousandsSeparator);
}

/**
 * Decimaal getal met locale-komma én duizendtal-groepering: 1234.5 -> '1.234,5'.
 * `digits` = aantal decimalen na afronding.
 */
export function formatDecimal(value: number, digits: number): string {
  const [whole, frac] = value.toFixed(digits).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, t.format.thousandsSeparator);
  return frac ? `${grouped}${t.format.decimalSeparator}${frac}` : grouped;
}

export function formatDistance(meters: number): string {
  return `${formatDecimal(meters / 1000, 2)} ${t.units.kilometer}`;
}

export function formatDistanceDynamic(meters: number): { value: string; unit: string } {
  if (meters < 1000) {
    return { value: formatInt(meters), unit: t.units.meter };
  }
  return { value: formatDecimal(meters / 1000, 2), unit: t.units.kilometer };
}

/**
 * `padMinutes` vult de minuten aan tot twee cijfers ('02:10') — alleen landscape; portrait houdt '2:10'.
 * `tenths` toont één decimaal ('2:10.4') — enkel zinvol op fractionele split-tijden die uit
 * `samples` zijn afgeleid; de live FTMS-pace is heel-seconde, daar zou de tiende nep zijn.
 */
export function formatSplit(splitSec: number, padMinutes = false, tenths = false): string {
  if (!Number.isFinite(splitSec)) return '—';
  if (tenths) {
    // Reken in tienden zodat 59,95 → 60,0 netjes naar de volgende minuut rolt.
    const totalTenths = Math.round(splitSec * 10);
    const m = Math.floor(totalTenths / 600);
    const rem = totalTenths % 600;
    const s = Math.floor(rem / 10);
    const d = rem % 10;
    const mm = padMinutes ? m.toString().padStart(2, '0') : m.toString();
    return `${mm}:${s.toString().padStart(2, '0')}${t.format.decimalSeparator}${d}`;
  }
  // Eerst afronden op hele seconden, dán splitsen — net als de tenths-tak hierboven.
  // `Math.round(splitSec % 60)` rondde de rest apart af en gaf daardoor ':60' zodra die
  // boven 59,5 lag: 539,7 werd '8:60' in plaats van '9:00'. Raakt elke fractionele bron,
  // dus de `real`-kolommen (best_2k_seconds is per bestDistanceTime interpolatie-uitkomst).
  const totaal = Math.round(splitSec);
  const m = Math.floor(totaal / 60);
  const s = totaal % 60;
  const mm = padMinutes ? m.toString().padStart(2, '0') : m.toString();
  return `${mm}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${t.dates.daysShort[date.getDay()]} ${date.getDate()} ${t.dates.monthsShort[date.getMonth()]}`;
}

export function formatDateTitle(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${t.dates.monthsShort[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateLong(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${t.dates.daysLong[date.getDay()]} ${date.getDate()} ${t.dates.monthsLong[date.getMonth()]} ${date.getFullYear()} ${t.dates.dateTimeSeparator} ${hours}:${minutes}`;
}

// --- Wheel picker item builders ---

export type WheelItem = { label: string; value: number; unit?: string };

/**
 * Splitst een WheelItem-label in zijn waarde-deel en zijn (cursieve) eenheid-deel.
 * Eén bron voor zowel de WheelPicker-rijen als de suggestie-chips, zodat de
 * waarde/eenheid-weergave tussen die twee niet kan driften.
 * Staat de eenheid niet als laatste token in het label (bv. split "2:00"), dan is
 * het hele label de waarde en komt er geen eenheid terug.
 */
export function wheelItemParts(item: WheelItem): { value: string; unit?: string } {
  if (!item.unit) return { value: item.label };
  const suffix = ` ${item.unit}`;
  const idx = item.label.lastIndexOf(suffix);
  if (idx === -1) return { value: item.label };
  return { value: item.label.slice(0, idx), unit: item.unit };
}

/**
 * Duur-label: onder een uur "45 min", vanaf een uur "1 u" / "1 u 10 min".
 * Één bron voor de workout-duur-wheel (buildDurItems, seconden) en de
 * periode-doel-wheel (GoalSheet.itemsFor, minuten), zodat ze niet driften.
 */
export function formatDurationLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  if (h === 0) return `${totalMinutes} ${t.units.minuteShort}`;
  return min === 0
    ? `${h} ${t.units.hourShort}`
    : `${h} ${t.units.hourShort} ${min} ${t.units.minuteShort}`;
}

/** 5–180 min, stap 5 min. `value` = totaal aantal seconden. */
export function buildDurItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let m = 5; m <= GOAL_INPUT_BOUNDS.duration.max; m += 5) {
    items.push({ label: formatDurationLabel(m), unit: t.units.minuteShort, value: m * 60 });
  }
  return items;
}

/** 500 m – 42 km, stap 500 m. `value` = totaal aantal meter. */
export function buildDistItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let m = GOAL_INPUT_BOUNDS.distance.min; m <= GOAL_INPUT_BOUNDS.distance.max; m += 500) {
    let label: string;
    let unit: string;
    if (m < 1000) {
      label = `${m} ${t.units.meter}`;
      unit = t.units.meter;
    } else {
      const km = m / 1000;
      label = Number.isInteger(km)
        ? `${formatInt(km)} ${t.units.kilometer}`
        : `${formatDecimal(km, 1)} ${t.units.kilometer}`;
      unit = t.units.kilometer;
    }
    items.push({ label, unit, value: m });
  }
  return items;
}

/** 1:30 – 3:00 /500m, stap 5 s. `value` = totaal aantal seconden. */
export function buildSplitItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let s = GOAL_INPUT_BOUNDS.split.min; s <= GOAL_INPUT_BOUNDS.split.max; s += 5) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    items.push({ label: `${m}:${sec.toString().padStart(2, '0')}`, value: s });
  }
  return items;
}

/** 50 – 500 W, stap 5 W. `value` = watt. */
export function buildWattItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let w = GOAL_INPUT_BOUNDS.watts.min; w <= GOAL_INPUT_BOUNDS.watts.max; w += 5) {
    items.push({ label: `${w} ${t.units.watt}`, unit: t.units.watt, value: w });
  }
  return items;
}
