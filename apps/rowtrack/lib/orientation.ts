// De app is portrait-only, behalve de active-workout schermen (portrait + landscape).
// app.json blijft op orientation "default" (Info.plist ondersteunt alle standen); de
// runtime-lock hieronder bepaalt wat effectief mag.
//
// expo-screen-orientation is een NATIVE module: hij zit pas in de build na een
// dev-client rebuild. We laden hem daarom lui + guarded — vóór de rebuild throwt de
// import ("Cannot find native module 'ExpoScreenOrientation'"), dus een top-level
// import zou de hele bundle laten crashen. We checken daarom eerst de native registry
// (requireOptionalNativeModule) en laden de JS-wrapper enkel als de module aanwezig is —
// anders een no-op tot de rebuild, zónder DEV LogBox-red-box.

import { requireOptionalNativeModule } from 'expo-modules-core';

type ScreenOrientationModule = typeof import('expo-screen-orientation');

let cached: ScreenOrientationModule | null | undefined;

function mod(): ScreenOrientationModule | null {
  if (cached !== undefined) return cached;
  // requireOptionalNativeModule leest de native registry ZONDER de JS-wrapper te laden en
  // returnt null als de module afwezig is. Zo triggeren we nooit de top-level
  // `requireNativeModule('ExpoScreenOrientation')` in de wrapper (ExpoScreenOrientation.js),
  // die anders throwt en in DEV een red-box geeft — Metro rapporteert die eval-fout vóór
  // onze try/catch hem vangt. Met de native module aanwezig laden we de wrapper wél.
  if (!requireOptionalNativeModule('ExpoScreenOrientation')) {
    cached = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-screen-orientation') as ScreenOrientationModule;
  } catch {
    cached = null; // wrapper-load faalde ondanks aanwezige native module
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
