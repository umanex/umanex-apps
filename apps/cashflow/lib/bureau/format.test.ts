import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateLabel, dayLabel, formatDays, formatHours, formatPercent, monthLabel, monthRangeLabel, parseNumber, toInputValue, weekLabel } from './format.ts';

test('parseNumber leest Belgische invoer', () => {
  const gevallen: Array<[string, number | null]> = [
    ['200.000', 200_000],
    ['200000', 200_000],
    ['1,5', 1.5],
    ['€ 1.250,50', 1_250.5],
    ['1.250.000', 1_250_000],
    ['−300', -300],
    ['-300', -300],
    ['30 %', 30],
    ['7,5 u', 7.5],
    ['1.5', 1.5], // geen drie cijfers achter de punt: een decimaal, geen duizendtal
    ['12.34', 12.34],
  ];
  for (const [invoer, verwacht] of gevallen) assert.equal(parseNumber(invoer), verwacht, invoer);
});

test('leeg of onleesbaar is null — nooit 0', () => {
  for (const invoer of ['', '   ', 'abc', '1,2,3', '€', '-', '1..0']) assert.equal(parseNumber(invoer), null, JSON.stringify(invoer));
});

test('toInputValue en parseNumber zijn elkaars omgekeerde', () => {
  for (const n of [0, 8, 7.5, 200_000, 1_562.5, -12.25]) assert.equal(parseNumber(toInputValue(n)), n);
  assert.equal(toInputValue(null), '');
});

test('eenheden', () => {
  assert.equal(formatHours(1.5), '1,5 u');
  assert.equal(formatDays(15.25), '15,3 d');
  assert.equal(formatDays(128), '128 d');
  assert.equal(formatPercent(0.42), '42 %');
  assert.equal(formatPercent(0.305, 1), '30,5 %');
});

test('week- en daglabels', () => {
  assert.equal(weekLabel('2026-W38'), 'Week 38 · 14–20 sep');
  assert.equal(weekLabel('2026-W40'), 'Week 40 · 28 sep–4 okt');
  assert.equal(dayLabel('2026-09-16'), 'wo 16 sep');
});

test('maandlabels: één maand, binnen een jaar, over een jaarwissel — en onleesbaar blijft zichtbaar', () => {
  assert.equal(monthLabel('2026-09'), 'sep 2026');
  assert.equal(monthRangeLabel('2026-09', '2026-09'), 'sep 2026');
  assert.equal(monthRangeLabel('2026-09', '2026-12'), 'sep – dec 2026');
  assert.equal(monthRangeLabel('2026-11', '2027-02'), 'nov 2026 – feb 2027');
  assert.equal(monthRangeLabel('', '2027-02'), ' – 2027-02');
});

test('een onleesbare datum in het document geeft tekst, geen crash', () => {
  assert.equal(dateLabel(''), '—');
  assert.equal(dateLabel('niet-een-datum'), 'niet-een-datum');
  assert.equal(dayLabel(''), '—');
  assert.equal(dateLabel('2026-09-16'), '16 september 2026');
});
