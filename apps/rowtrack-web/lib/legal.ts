import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Marked } from 'marked';

/**
 * Leest een juridisch document uit de repo en levert het als HTML.
 *
 * Het privacybeleid blijft staan waar het hoort: bij de app die het beschrijft
 * (`apps/rowtrack/docs/privacybeleid.md`). Deze site rendert dat bestand in plaats
 * van er een kopie van te houden. Een tweede exemplaar van een juridische tekst
 * drijft weg — en juist bij dit document is dat niet cosmetisch, want de App
 * Privacy-labels in App Store Connect moeten ermee kloppen.
 *
 * Het document wordt VERBATIM gerenderd. Er wordt niets uitgeknipt, herschikt of
 * samengevat: bij een juridische tekst is elke programmatische bewerking een stille
 * inhoudelijke wijziging, en de winst van een mooier uitgelichte datumregel weegt
 * daar niet tegenop.
 *
 * De read gebeurt bij de BUILD, niet per verzoek: de pagina wordt statisch
 * geprerenderd, dus de HTML zit in het bundel en `marked` gaat nooit naar de
 * browser. Het pad hangt aan process.cwd(), en dat is bij zowel `turbo` als Vercel
 * de app-map.
 */

const DOCS = {
  privacy: '../rowtrack/docs/privacybeleid.md',
} as const;

export type LegalDoc = keyof typeof DOCS;

// Eigen instantie in plaats van de globale: de globale `marked` draagt opties tussen
// aanroepen mee, dus een tweede document zou stil andermans instellingen erven.
// gfm zet tabellen aan — het beleid heeft er drie.
const marked = new Marked({ gfm: true, breaks: false });

export async function legalHtml(doc: LegalDoc): Promise<string> {
  const source = await readFile(join(process.cwd(), DOCS[doc]), 'utf-8');
  return marked.parse(source);
}
