import { GOAL_INPUT_BOUNDS } from './workout-goals';

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

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDistanceDynamic(meters: number): { value: string; unit: string } {
  if (meters < 1000) {
    return { value: `${Math.round(meters)}`, unit: 'm' };
  }
  return { value: (meters / 1000).toFixed(2), unit: 'km' };
}

/**
 * Meters with a Dutch thousands separator, no unit: 1234 -> '1.234', 850 -> '850'.
 * Landscape-only notation (portrait/design uses km); append ' m' at the call site if needed.
 */
export function formatMetersDotted(meters: number): string {
  const m = Math.round(meters);
  return String(m).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** `padMinutes` pads the minutes to two digits ('02:10') — landscape-only; portrait keeps '2:10'. */
export function formatSplit(splitSec: number, padMinutes = false): string {
  if (!Number.isFinite(splitSec)) return '—';
  const m = Math.floor(splitSec / 60);
  const s = Math.round(splitSec % 60);
  const mm = padMinutes ? m.toString().padStart(2, '0') : m.toString();
  return `${mm}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const days = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const months = [
    'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
  ];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

export function formatDateTitle(iso: string): string {
  const date = new Date(iso);
  const months = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateLong(iso: string): string {
  const date = new Date(iso);
  const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const months = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december',
  ];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} \u2022 ${hours}:${minutes}`;
}

// --- Wheel picker item builders ---

export type WheelItem = { label: string; value: number; unit?: string };

/**
 * Splits a WheelItem label into its value part and (italic) unit part.
 * Single source of truth for both the WheelPicker rows and the suggestion
 * chips, so the value/unit rendering can never drift between the two.
 * When the unit isn't a trailing token of the label (e.g. split "2:00"),
 * the whole label is the value and no unit is returned.
 */
export function wheelItemParts(item: WheelItem): { value: string; unit?: string } {
  if (!item.unit) return { value: item.label };
  const suffix = ` ${item.unit}`;
  const idx = item.label.lastIndexOf(suffix);
  if (idx === -1) return { value: item.label };
  return { value: item.label.slice(0, idx), unit: item.unit };
}

/** 5\u2013180 minutes, step 5 min. value = total seconds. */
export function buildDurItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let m = 5; m <= GOAL_INPUT_BOUNDS.duration.max; m += 5) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const label = h > 0
      ? min === 0 ? `${h} u` : `${h} u ${min} min`
      : `${m} min`;
    items.push({ label, unit: 'min', value: m * 60 });
  }
  return items;
}

/** 500 m \u2013 42 km, step 500 m. value = total meters. */
export function buildDistItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let m = GOAL_INPUT_BOUNDS.distance.min; m <= GOAL_INPUT_BOUNDS.distance.max; m += 500) {
    let label: string;
    let unit: string;
    if (m < 1000) {
      label = `${m} m`;
      unit = 'm';
    } else {
      const km = m / 1000;
      label = Number.isInteger(km)
        ? `${km} km`
        : `${km.toFixed(1).replace('.', ',')} km`;
      unit = 'km';
    }
    items.push({ label, unit, value: m });
  }
  return items;
}

/** 1:30 \u2013 3:00 /500m, step 5 sec. value = total seconds. */
export function buildSplitItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let s = GOAL_INPUT_BOUNDS.split.min; s <= GOAL_INPUT_BOUNDS.split.max; s += 5) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    items.push({ label: `${m}:${sec.toString().padStart(2, '0')}`, value: s });
  }
  return items;
}

/** 50 \u2013 500 W, step 5 W. value = watts. */
export function buildWattItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let w = GOAL_INPUT_BOUNDS.watts.min; w <= GOAL_INPUT_BOUNDS.watts.max; w += 5) {
    items.push({ label: `${w} W`, unit: 'W', value: w });
  }
  return items;
}
