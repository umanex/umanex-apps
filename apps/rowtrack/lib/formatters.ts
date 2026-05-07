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

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDistanceDynamic(meters: number): { value: string; unit: string } {
  if (meters < 1000) {
    return { value: `${Math.round(meters)}`, unit: 'm' };
  }
  return { value: (meters / 1000).toFixed(2), unit: 'km' };
}

export function formatSplit(splitSec: number): string {
  const m = Math.floor(splitSec / 60);
  const s = Math.round(splitSec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
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

export type WheelItem = { label: string; value: number };

/** 1\u2013180 minutes, step 1 min. value = total seconds. */
export function buildDurItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let m = 1; m <= 180; m++) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const label = h > 0
      ? min === 0 ? `${h} u` : `${h} u ${min} min`
      : `${m} min`;
    items.push({ label, value: m * 60 });
  }
  return items;
}

/** 500 m \u2013 42 km, step 500 m. value = total meters. */
export function buildDistItems(): WheelItem[] {
  const items: WheelItem[] = [];
  for (let i = 1; i <= 84; i++) {
    const m = i * 500;
    let label: string;
    if (m < 1000) {
      label = `${m} m`;
    } else {
      const km = m / 1000;
      label = Number.isInteger(km)
        ? `${km} km`
        : `${km.toFixed(1).replace('.', ',')} km`;
    }
    items.push({ label, value: m });
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
    items.push({ label: `${w} W`, value: w });
  }
  return items;
}
