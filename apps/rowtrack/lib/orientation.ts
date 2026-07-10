// De app is portrait-only, behalve de active-workout schermen (portrait + landscape).
// app.json blijft op orientation "default" (Info.plist ondersteunt alle standen); de
// runtime-lock hieronder bepaalt wat effectief mag.
//
// expo-screen-orientation is een NATIVE module: hij zit pas in de build na een
// dev-client rebuild. We laden hem daarom lui + guarded — vóór de rebuild throwt de
// import ("Cannot find native module 'ExpoScreenOrientation'"), dus een top-level
// import zou de hele bundle laten crashen. Lazy require + try/catch degradeert naar
// een no-op tot de rebuild.

type ScreenOrientationModule = typeof import('expo-screen-orientation');

let cached: ScreenOrientationModule | null | undefined;

function mod(): ScreenOrientationModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-screen-orientation') as ScreenOrientationModule;
  } catch {
    cached = null; // native module nog niet in de build
  }
  return cached;
}

/** Vergrendel op portrait — de app-brede default. */
export function lockPortrait(): void {
  const so = mod();
  if (!so) return;
  try {
    so.lockAsync(so.OrientationLock.PORTRAIT_UP).catch(() => {});
  } catch {
    /* no-op */
  }
}

/** Sta alle standen toe — enkel tijdens de active workout. */
export function allowAllOrientations(): void {
  const so = mod();
  if (!so) return;
  try {
    so.unlockAsync().catch(() => {});
  } catch {
    /* no-op */
  }
}
