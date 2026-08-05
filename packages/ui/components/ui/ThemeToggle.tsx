'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Schakelt de `dark` class op <html> en onthoudt de keuze in localStorage.
 *
 * Hoort samen met het theme-init script in de app-layout, dat diezelfde class vóór
 * first paint zet. Zonder dat script krijg je een flits van het verkeerde theme;
 * zonder deze knop kan de bezoeker er niet uit.
 */
export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Schakel naar light mode' : 'Schakel naar dark mode'}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* render pas na mount om hydration mismatch met het theme-init script te vermijden */}
      {isDark === null ? null : isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
};
