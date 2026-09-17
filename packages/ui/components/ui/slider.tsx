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
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    data-slot="slider"
    className={cn('relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50', className)}
    {...props}
  >
    <SliderPrimitive.Track data-slot="slider-track" className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb data-slot="slider-thumb" className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
