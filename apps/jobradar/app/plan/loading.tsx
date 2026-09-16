/**
 * De laadtoestand van het plan.
 *
 * Tekst en geen skeleton: deze app heeft geen skeleton-primitive, en een nagemaakte
 * structuur zou een indeling suggereren die er nog niet is. De kop staat er wel al, zodat de
 * pagina niet leeg oogt terwijl de database opent.
 */
export default function PlanLaden() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Bedrijfsplan 2027</h1>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Plan laden…
        </p>
      </div>
    </main>
  )
}
