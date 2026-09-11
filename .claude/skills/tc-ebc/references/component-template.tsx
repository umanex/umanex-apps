// @figma [URL indien beschikbaar, anders deze regel weglaten]
//
// Volledig voorbeeld volgens de globale umanex-conventies:
// - 1 component = 1 file (subcomponenten elk in hun eigen file)
// - PascalCase bestands- en componentnaam
// - props als `type` (niet `interface`)
// - plain function syntax, geen React.FC
// - geen hardcoded kleuren/spacing/radii — altijd via token-pad (Tailwind class of CSS var)

import { type ReactNode } from 'react'

type CardProps = {
  title: string
  children: ReactNode
  // Voeg alleen props toe die het component echt nodig heeft.
}

export const Card = ({ title, children }: CardProps) => {
  return (
    <div className="rounded-md bg-surface p-4">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  )
}
