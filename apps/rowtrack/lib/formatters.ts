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

/** 1\u2013180 minutes, step 1 min. value = total seconds. */
export function buildDurItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let m = 1; m <= 180; m++) {
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
  for (let i = 1; i <= 84; i++) {
    const m = i * 500;
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

/** 1:30 \u2013 3:00 /500m, step 1 sec. value = total seconds. */
export function buildSplitItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let s = 90; s <= 180; s++) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    items.push({ label: `${m}:${sec.toString().padStart(2, '0')}`, value: s });
  }
  return items;
}

/** 50 \u2013 500 W, step 5 W. value = watts. */
export function buildWattItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let w = 50; w <= 500; w += 5) {
    items.push({ label: `${w} W`, unit: 'W', value: w });
  }
  return items;
}
