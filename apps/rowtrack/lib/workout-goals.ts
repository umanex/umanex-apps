import type { IoniconsName } from '@/components/Icon';

// --- Types ---

export type GoalType = 'duration' | 'distance' | 'split' | 'watts';

export interface WorkoutGoal {
  type: GoalType;
  target: number; // seconden (duration), meters (distance), sec/500m (split), watt
}

export interface GoalProgress {
  current: number;
  target: number;
  percentage: number; // 0–100, clamped
  reached: boolean;
}

// --- Config per goal type ---

export interface GoalTypeConfig {
  label: string;
  icon: IoniconsName;
  unit: string;
  placeholder: string;
  formatTarget: (value: number) => string;
  formatCurrent: (value: number) => string;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const GOAL_TYPES: Record<GoalType, GoalTypeConfig> = {
  duration: {
    label: 'Tijd',
    icon: 'time-outline',
    unit: 'min',
    placeholder: '30',
    formatTarget: (v) => `${v / 60} min`,
    formatCurrent: (v) => fmtTime(v),
  },
  distance: {
    label: 'Afstand',
    icon: 'navigate-outline',
    unit: 'm',
    placeholder: '5000',
    formatTarget: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} km` : `${v} m`),
    formatCurrent: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} km` : `${Math.round(v)} m`),
  },
  split: {
    label: 'Split',
    icon: 'speedometer-outline',
    unit: 'sec/500m',
    placeholder: '120',
    formatTarget: (v) => `${fmtTime(v)}/500m`,
    formatCurrent: (v) => `${fmtTime(v)}/500m`,
  },
  watts: {
    label: 'Watt',
    icon: 'flash-outline',
    unit: 'W',
    placeholder: '180',
    formatTarget: (v) => `${v} W`,
    formatCurrent: (v) => `${Math.round(v)} W`,
  },
};

export const GOAL_TYPE_ORDER: GoalType[] = ['duration', 'distance', 'split', 'watts'];

/**
 * Min/max grenzen per doeltype in user-input-eenheden
 * (duration: minuten, distance: meter, split: sec/500m, watts: watt).
 * Eén bron van waarheid: de GoalSetupModal-clamp én de WheelPicker
 * item-builders in formatters.ts leiden hun grenzen hieruit af.
 */
export const GOAL_INPUT_BOUNDS: Record<GoalType, { min: number; max: number }> = {
  duration: { min: 1, max: 180 },
  distance: { min: 500, max: 42000 },
  split: { min: 90, max: 180 },
  watts: { min: 50, max: 500 },
};

// --- Goal suggestions ---

/**
 * Relevant fallback targets per goal type (raw Supabase units), used to fill
 * the suggestion row up to 3 chips when a user has fewer than 3 recent picks.
 * duration: seconds · distance: meters · split: sec/500m · watts: watt.
 */
export const GOAL_DEFAULT_SUGGESTIONS: Record<GoalType, number[]> = {
  duration: [1200, 1800, 2700], // 20, 30, 45 min
  distance: [2000, 5000, 10000], // 2, 5, 10 km
  split:    [120, 130, 140],    // 2:00, 2:10, 2:20 /500m
  watts:    [150, 180, 200],
};

/**
 * Builds exactly 3 WheelPicker indices to suggest for a goal type: the most
 * recently chosen targets first, padded with relevant defaults. Deduplicates
 * on wheel index and drops out-of-range targets, so the result is always ≤ 3
 * valid, distinct indices (3 whenever defaults are in range, which they are).
 */
export function buildGoalSuggestions(type: GoalType, recents: number[]): number[] {
  const indices: number[] = [];
  const seen = new Set<number>();
  const push = (target: number) => {
    const idx = goalTargetToWheelIndex(type, target);
    if (idx !== null && !seen.has(idx)) {
      seen.add(idx);
      indices.push(idx);
    }
  };
  recents.forEach(push);
  GOAL_DEFAULT_SUGGESTIONS[type].forEach(push);
  return indices.slice(0, 3);
}

/**
 * Converts a saved goal_target value (raw Supabase units) back to its
 * index in the matching WheelPicker array. Returns null when out of range.
 */
export function goalTargetToWheelIndex(type: GoalType, target: number): number | null {
  switch (type) {
    case 'duration': {
      const idx = Math.round(target / 60) - 1;        // 1–180 min → 0–179
      return idx >= 0 && idx <= 179 ? idx : null;
    }
    case 'distance': {
      const idx = Math.round(target / 500) - 1;       // 500–42000 m → 0–83
      return idx >= 0 && idx <= 83 ? idx : null;
    }
    case 'split': {
      const idx = Math.round(target) - 90;            // 90–180 s → 0–90
      return idx >= 0 && idx <= 90 ? idx : null;
    }
    case 'watts': {
      const idx = Math.round((target - 50) / 5);      // 50–500 W → 0–90
      return idx >= 0 && idx <= 90 ? idx : null;
    }
  }
}

// --- Input conversie ---

export function userInputToTarget(type: GoalType, input: number): number {
  if (type === 'duration') return input * 60;
  return input;
}

export function targetToUserInput(type: GoalType, target: number): number {
  if (type === 'duration') return target / 60;
  return target;
}

// --- Progress berekening ---

export function calculateProgress(
  goal: WorkoutGoal,
  metrics: {
    seconds: number;
    distanceMeters: number;
    splitSeconds: number;
    avgWatts: number;
  },
): GoalProgress {
  const { type, target } = goal;

  switch (type) {
    case 'duration': {
      const current = metrics.seconds;
      const percentage = Math.min((current / target) * 100, 100);
      return { current, target, percentage, reached: current >= target };
    }
    case 'distance': {
      const current = metrics.distanceMeters;
      const percentage = Math.min((current / target) * 100, 100);
      return { current, target, percentage, reached: current >= target };
    }
    case 'split': {
      const current = metrics.splitSeconds;
      if (current <= 0) return { current, target, percentage: 0, reached: false };
      const reached = current <= target;
      const percentage = reached ? 100 : Math.min((target / current) * 100, 99);
      return { current, target, percentage, reached };
    }
    case 'watts': {
      const current = metrics.avgWatts;
      const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      return { current, target, percentage, reached: current >= target };
    }
  }
}
