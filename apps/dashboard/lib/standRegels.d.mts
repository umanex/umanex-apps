// Typen voor `lib/standRegels.mjs`.
//
// De regels staan bewust in een `.mjs`: `scripts/guards-selftest.mjs` moet ze zonder
// testrunner en zonder build kunnen draaien, net als `lib/guardRules.mjs`. Dat kost een
// los declaratiebestand, en dat is de prijs waard — een pure regel die je niet kunt
// draaien zonder de hele app te bouwen, wordt niet getoetst.

export declare const GERESERVEERDE_SLUGS: string[];

export declare function slugGeldig(slug: unknown): boolean;

export declare function versheid(
  measuredAt: unknown,
  verouderdNaDagen: unknown,
  nu?: number,
): { staat: 'vers' | 'verouderd' | 'ontbreekt'; dagen: number | null; reden: string | null };

export declare function telOp<T>(rijen: T[] | undefined, veld: string): number;

export declare function aggregaatKlopt<T>(
  naam: string,
  aggregaat: number,
  rijen: T[] | undefined,
  veld: string,
): string | null;

export type Schuld = {
  met_bewijs: number;
  zonder_bewijs: number;
  open: number;
  items: number;
  briefings: number;
};

export declare function verificatieschuld(briefings: unknown): Schuld;

export declare const BEWIJS_CONVENTIE_VANAF: string;

export declare function cohorten(
  briefings: unknown,
  vanaf?: string,
): { voor: Schuld; na: Schuld; vanaf: string };
