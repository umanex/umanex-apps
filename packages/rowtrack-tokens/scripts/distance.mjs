/**
 * Damerau-Levenshtein — bewerkingsafstand met omwisseling als één bewerking.
 *
 * Gedeeld door guard.mjs en margin.mjs. Zouden die twee elk hun eigen metriek
 * hebben, dan meet margin.mjs een marge die voor de guard niet geldt, en dat is
 * precies zo waardeloos als geen marge meten.
 *
 * Waarom Damerau en niet gewoon Levenshtein: de meest gemaakte tikfout is twee
 * letters omwisselen. In gewone Levenshtein kost `defualt` -> `default` twee
 * bewerkingen, evenveel als de echte Tailwind-klasse `rounded-full` van onze rol
 * `pill` af ligt. Op één drempel zijn die dan niet te scheiden: of je mist de
 * tikfout, of je keurt een geldige klasse af. Met omwisseling als één bewerking
 * zakt de tikfout naar 1 en blijft het toevallige buurpaar op 2 — en past er een
 * drempel tussen.
 */
export function distance(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const kost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // verwijderen
        d[i][j - 1] + 1,      // invoegen
        d[i - 1][j - 1] + kost // vervangen
      );
      // Omwisseling van twee naastliggende tekens telt als één bewerking.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[m][n];
}
