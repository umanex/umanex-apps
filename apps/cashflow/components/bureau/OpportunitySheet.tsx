'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@umanex/ui/components/ui/sheet';
import { useBureau } from '../../hooks/useBureau';
import { OpportunityForm } from './OpportunityForm';
import { OpportunityDetail } from './OpportunityDetail';

type OpportunitySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bestaande kans; `null` maakt een nieuwe aan. */
  opportunityId: string | null;
  /**
   * Waar de focus heen gaat bij sluiten. De sheet hangt aan de pagina en niet aan een rij: een
   * stadiumwissel verhuist de rij naar een andere groep (of achter "Toon afgesloten"), en een sheet
   * ín die rij zou dan midden in het werk dichtklappen. Radix geeft de focus alleen terug aan een
   * `SheetTrigger`, dus de pagina beslist hier zelf.
   */
  onCloseAutoFocus: (event: Event) => void;
};

export function OpportunitySheet({ open, onOpenChange, opportunityId, onCloseAutoFocus }: OpportunitySheetProps) {
  const company = useBureau().opportunities.find((o) => o.id === opportunityId)?.company;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <SheetHeader>
          <SheetTitle>{opportunityId ? (company ?? 'Kans') : 'Nieuwe kans'}</SheetTitle>
          <SheetDescription>
            {opportunityId
              ? 'Een kans is geen getekend werk: ze telt pas mee als omzet of capaciteit wanneer ze een project is.'
              : 'Een lichte registratie: wie, waarom nu, wat ze nodig hebben en wat de volgende stap is.'}
          </SheetDescription>
        </SheetHeader>
        {opportunityId ? (
          <OpportunityDetail opportunityId={opportunityId} onRemoved={() => onOpenChange(false)} />
        ) : (
          <div className="mt-6">
            <OpportunityForm onDone={() => onOpenChange(false)} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
