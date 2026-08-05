/**
 * Haalt een leesbare melding uit wat er ook maar gegooid is.
 *
 * Bestaat omdat `instanceof Error` hier niet volstaat: PostgREST-fouten komen via
 * supabase-js binnen als een plat object met `message`, `code`, `details` en `hint`.
 * Een afhandeling die alleen naar Error kijkt, valt bij precies die fouten terug op
 * "onbekend" — en dat zijn nu net de fouten waar de oorzaak in staat.
 */
export function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const shape = error as { message?: unknown; code?: unknown; hint?: unknown; details?: unknown };
    if (typeof shape.message === 'string' && shape.message.length > 0) {
      const extra = [shape.code, shape.details, shape.hint]
        .filter((part): part is string => typeof part === 'string' && part.length > 0)
        .join(' — ');
      return extra ? `${shape.message} (${extra})` : shape.message;
    }
  }

  if (error instanceof Error) return error.message;
  return 'Onbekende fout';
}
