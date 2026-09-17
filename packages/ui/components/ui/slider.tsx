'use client'

import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '../../lib/utils'

/**
 * `data-[disabled]:opacity-50` op de wortel, niet `disabled:` op de thumb. Tot 2026-09-16 stond hier
 * `disabled:pointer-events-none disabled:opacity-50` op de thumb — een `<span>`, en een span matcht
 * `:disabled` nooit. Een uitgeschakelde Slider zag er daardoor in de browser identiek uit aan een
 * actieve (gemeten: wortel en thumb allebei opacity 1 bij `disabled`), terwijl Figma hem op 0,5 tekent.
 * Radix zet `data-disabled` op de wortel; daarop hangen, zoals shadcn v4 doet.
 */
type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /**
   * De naam van de greep, als `aria-label` op de thumb.
   *
   * Radix geeft de thumb `role="slider"` maar geen naam, en het zichtbare label ernaast hoort bij
   * de rij en niet bij de greep — een schermlezer las dus "slider" zonder te zeggen wáárvan.
   * Gemeten in jobradar (fase 3): de thumb van Min. score was het enige naamloze bedieningselement
   * op `/`, en stond daar als benoemde uitzondering in de naam-as van de harness.
   *
   * Optioneel, want de naam hoort bij de gebruiksplek: alleen die weet of de greep "Minimumscore"
   * of "Prijsplafond" heet. Een Slider zonder label rendert zoals voorheen; wie hem vergeet, wordt
   * gevangen door een naam-as op de route (jobradar) en niet door een lege standaardnaam hier.
   */
  thumbLabel?: string
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, thumbLabel, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      data-slot="slider"
      className={cn('relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50', className)}
      {...props}
    >
      <SliderPrimitive.Track data-slot="slider-track" className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        data-slot="slider-thumb"
        className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </SliderPrimitive.Root>
  )
)
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
