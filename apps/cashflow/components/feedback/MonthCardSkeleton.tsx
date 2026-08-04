'use client';

/**
 * Skelet van één maandkolom. Getoond tot de store uit localStorage geladen is — de
 * server rendert hetzelfde skelet, zodat de eerste client-render ermee overeenkomt en
 * er geen nullen flitsen vóór je echte cijfers verschijnen.
 */
export function MonthCardSkeleton() {
  return (
    <div
      className="flex flex-col h-full min-h-0 rounded-xl border border-[var(--umanexPrimary50)] bg-card overflow-hidden"
      aria-hidden="true"
    >
      <div className="shrink-0 px-6 py-3 bg-[var(--umanexNeutral100)]">
        <div className="h-5 w-32 rounded bg-[var(--umanexNeutral200)] animate-pulse" />
      </div>

      <div className="flex-1 min-h-0 p-4 flex flex-col gap-5">
        {/* Beginsaldo + vier kostenstappen, elk met een paar detailregels. */}
        <div className="h-9 px-2 flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-[var(--umanexNeutral200)] animate-pulse" />
          <div className="h-4 w-20 rounded bg-[var(--umanexNeutral200)] animate-pulse" />
        </div>

        {[0, 1, 2, 3].map((section) => (
          <div key={section} className="flex flex-col gap-2">
            <div className="h-7 px-2 flex items-center justify-between rounded-[4px] bg-[var(--umanexNeutral100)]">
              <div className="h-3.5 w-28 rounded bg-[var(--umanexNeutral200)] animate-pulse" />
              <div className="h-3.5 w-16 rounded bg-[var(--umanexNeutral200)] animate-pulse" />
            </div>
            {[0, 1].map((row) => (
              <div key={row} className="h-7 px-2 flex items-center justify-between">
                <div className="h-3 w-32 rounded bg-[var(--umanexNeutral100)] animate-pulse" />
                <div className="h-3 w-14 rounded bg-[var(--umanexNeutral100)] animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-[var(--umanexPrimary50)] px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-20 rounded bg-[var(--umanexNeutral100)] animate-pulse" />
          <div className="h-3.5 w-20 rounded bg-[var(--umanexNeutral100)] animate-pulse" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 rounded bg-[var(--umanexNeutral200)] animate-pulse" />
          <div className="h-5 w-28 rounded bg-[var(--umanexNeutral200)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
