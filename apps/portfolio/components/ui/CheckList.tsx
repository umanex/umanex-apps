import { Check, X } from 'lucide-react';

type Props = {
  items: readonly string[];
  /** 'yes' bevestigt, 'no' sluit uit — het icoon en de kleur volgen daaruit. */
  tone: 'yes' | 'no';
};

// Lijst met een icoon per regel. Gebruikt op /aanbod (past wel / past niet) en op /scan
// (wat de scan meet / wat hij niet is).
export const CheckList = ({ items, tone }: Props) => {
  const Icon = tone === 'yes' ? Check : X;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm text-muted-foreground">
          <Icon
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              tone === 'yes' ? 'text-success' : 'text-muted-foreground'
            }`}
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};
