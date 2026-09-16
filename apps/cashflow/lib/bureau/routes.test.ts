import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_NAV, BUREAU_NAV, activeHref } from './routes.ts';

test('hoofdnavigatie: de wortel is alleen actief op zichzelf', () => {
  assert.equal(activeHref('/', APP_NAV), '/');
  assert.equal(activeHref('/analyse', APP_NAV), '/analyse');
  assert.equal(activeHref('/bureau', APP_NAV), '/bureau');
  assert.equal(activeHref('/bureau/projecten/abc', APP_NAV), '/bureau', 'een diepe bureau-route licht Bureau op, niet Prognose');
  assert.equal(activeHref('/iets-anders', APP_NAV), null);
});

test('bureau-navigatie: Overzicht licht niet op op een subpagina, de subpagina wel — ook op een detail', () => {
  assert.equal(activeHref('/bureau', BUREAU_NAV), '/bureau');
  assert.equal(activeHref('/bureau/tijd', BUREAU_NAV), '/bureau/tijd');
  assert.equal(activeHref('/bureau/projecten/p1', BUREAU_NAV), '/bureau/projecten');
});
