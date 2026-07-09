import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

/**
 * Globale deep-link-capture. Nodig omdat de router op een warm start het
 * `'url'`-event consumeert om te navigeren vóórdat een scherm z'n eigen listener
 * kan aanhaken — een scherm-lokale listener mist dat event dan. Door vanaf de
 * RootLayout (die de hele app-levensduur gemount is) te capturen, blijft de
 * recovery-URL bewaard tot het reset-scherm hem leest. `getInitialURL()` mag de
 * URL nooit met `null` overschrijven; alleen een echte URL wordt bewaard.
 */

let latestUrl: string | null = null;
let resolved = false;
let started = false;
const subscribers = new Set<() => void>();

function notify() {
  for (const cb of subscribers) cb();
}

/** Start de capture één keer, vanuit een component met app-levensduur. */
export function startDeepLinkCapture(): () => void {
  if (started) return () => {};
  started = true;

  Linking.getInitialURL()
    .then((url) => {
      if (url) latestUrl = url;
    })
    .catch(() => {})
    .finally(() => {
      resolved = true;
      notify();
    });

  const sub = Linking.addEventListener('url', ({ url }) => {
    latestUrl = url;
    resolved = true;
    notify();
  });

  return () => {
    sub.remove();
    started = false;
  };
}

/** Laatst geziene deep-link-URL sinds app-start, plus of de capture al settled is. */
export function useDeepLink(): { url: string | null; resolved: boolean } {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((n) => n + 1);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);
  return { url: latestUrl, resolved };
}
