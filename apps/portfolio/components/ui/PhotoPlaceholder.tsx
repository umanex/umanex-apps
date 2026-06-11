import { User } from 'lucide-react';

// TODO: vervangen door echte foto zodra beschikbaar.
// Spec: portretfoto, verhouding 4:5, minimaal 800×1000 px, rustige neutrale achtergrond.
export const PhotoPlaceholder = () => (
  <div
    role="img"
    aria-label="Portretfoto van Jeroen Colpaert volgt"
    className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted"
  >
    <div className="space-y-2 text-center text-muted-foreground">
      <User className="mx-auto h-12 w-12" aria-hidden="true" />
      <p className="text-xs">Foto volgt — 4:5, min. 800×1000&nbsp;px</p>
    </div>
  </div>
);
