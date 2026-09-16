'use client';

import { useState, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@umanex/ui/components/ui/sheet';
import type { Project } from '../../lib/bureau/types';
import { ProjectForm } from './ProjectForm';

type ProjectSheetProps = {
  /** De knop die de sheet opent. Via `SheetTrigger`, zodat de focus bij sluiten naar die knop terugkeert. */
  trigger: ReactNode;
  /** Bewerken; zonder project maakt de sheet een nieuw aan. */
  project?: Project;
  onCreated?: (projectId: string) => void;
};

/** Aanmaken of bewerken van de basisgegevens van een project. Mijlpalen, kosten en facturen staan op de projectpagina. */
export function ProjectSheet({ trigger, project, onCreated }: ProjectSheetProps) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{project ? 'Project bewerken' : 'Nieuw project'}</SheetTitle>
          <SheetDescription>
            Een project is getekend werk tegen een vaste prijs. Mijlpalen, uitbreidingen, externe kosten en facturen voeg je daarna toe op de projectpagina.
          </SheetDescription>
        </SheetHeader>
        <ProjectForm
          project={project}
          onDone={(id, created) => {
            setOpen(false);
            if (created) onCreated?.(id);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
