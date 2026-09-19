'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'

/**
 * De enige navigatie van jobradar, gemonteerd in `app/layout.tsx`.
 *
 * Tot 2026-09-19 droeg elke route zijn eigen kop met zijn eigen links: het dashboard linkte naar
 * Bedrijfsplan en Instellingen, het plan linkte terug met een pijl en naar Instellingen, en de
 * instellingen linkten alleen terug. Waar je was en waar je heen kon verschilde dus per pagina.
 *
 * Bewust géén primitive uit `@umanex/ui`: de balk kent drie vaste routes van deze app. Een
 * NavigationMenu (bibliotheekbatch 2) lost hier niets op wat een `ul` met drie links niet doet.
 *
 * Het wordmerk is geen link. Het staat naast een link "Radar" die al naar `/` wijst, en twee
 * links naar dezelfde route naast elkaar leest een schermlezer als twee keer hetzelfde doel.
 * Het is ook geen kop: de kopstructuur van elke route begint bij zijn eigen h1, en een h1 in de
 * layout zou op élke route de eerste kop zijn.
 */

const ROUTES = [
  { href: '/', label: 'Radar' },
  { href: '/plan', label: 'Plan' },
  { href: '/instellingen', label: 'Instellingen' },
] as const

/**
 * `usePathname` geeft het pad zonder querystring en zonder hash, dus `/?tab=leads` en
 * `/instellingen#bedrijfsplan` markeren vanzelf de juiste link. De prefix-tak is er voor een
 * toekomstige subroute (`/plan/xyz`); zonder die tak zou zo'n pagina nergens meer "hier ben je"
 * tonen, en dat zou pas opvallen als iemand hem bouwt.
 */
const isActief = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

/**
 * Los van `isActief`, en dat is het punt. "Markeer deze link als de huidige" en "dit is letterlijk
 * hetzelfde pad" vallen vandaag samen, maar niet zodra er een subroute bestaat: op `/plan/xyz` is
 * "Plan" wél de huidige sectie én wijst hij naar een ánder pad — precies het geval waarin
 * `next/link` werkt en de boundary leegt. Eén predicaat voor beide zou die link onnodig de hele
 * pagina laten herladen.
 */
const isZelfdePad = (pathname: string, href: string) => pathname === href

export const AppHeader = () => {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <span className="text-sm font-semibold tracking-tight">JobRadar</span>
        <nav aria-label="Hoofdnavigatie">
          <ul className="flex items-center gap-4">
            {ROUTES.map(({ href, label }) => {
              const actief = isActief(pathname, href)
              const zelfdePad = isZelfdePad(pathname, href)
              const klasse = cn(
                'rounded-sm text-sm transition-colors hover:text-foreground',
                actief ? 'font-medium text-foreground' : 'text-muted-foreground',
                focusRing
              )
              // Een gewone <a> en geen next/link, maar alléén bij hetzelfde pad. Op `actief`
              // zou fout zijn: dat is ook waar op een subroute (`/plan/xyz`), en daar wijst de
              // link naar een ánder pad — net het geval waarin next/link wérkt. Reden, gelezen in
              // `next/dist/client/components/error-boundary.js:64` (15.5.25): de error-boundary
              // reset alléén wanneer `pathname` verandert. Een client-navigatie naar de route
              // waar je al staat verandert hem niet, dus op de foutpagina zou deze link een
              // zichtbare knop zijn die niets doet — juist daar waar je een uitweg zoekt.
              // Een volledige herlading is bovendien een redelijke betekenis voor "klik waar je
              // al bent". `error.tsx` lost hetzelfde op dezelfde manier op.
              return (
                <li key={href}>
                  {zelfdePad ? (
                    // eslint-disable-next-line @next/next/no-html-link-for-pages -- bewust een volledige herlading, zie hierboven
                    <a href={href} aria-current="page" className={klasse}>
                      {label}
                    </a>
                  ) : (
                    <Link href={href} aria-current={actief ? 'page' : undefined} className={klasse}>
                      {label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
