type Props = {
  /** Eén schema.org-object. Meerdere schema's = meerdere JsonLd-elementen. */
  schema: Record<string, unknown>;
};

/**
 * Rendert structured data als `<script type="application/ld+json">`.
 *
 * Server-component, dus het script staat in de INITIËLE HTML. Dat is de door Google
 * aanbevolen vorm: structured data die pas na hydratie verschijnt, wordt door een
 * deel van de crawlers niet gezien.
 *
 * `dangerouslySetInnerHTML` is hier de juiste weg en niet gevaarlijk: de inhoud komt
 * uit onze eigen `lib/schema.ts`, nooit uit gebruikersinvoer. JSON.stringify escapet
 * geen `<`, dus `</script>` in een waarde zou het script vroegtijdig sluiten —
 * vandaar de vervanging hieronder.
 */
export const JsonLd = ({ schema }: Props) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
    }}
  />
);
