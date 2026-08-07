import {
  closestCorners,
  getFirstCollision,
  KeyboardCode,
  type DroppableContainer,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';

/**
 * Toetsenbord-navigatie voor een sleep tussen maandkolommen.
 *
 * Waarom niet `sortableKeyboardCoordinates` uit `@dnd-kit/sortable`: die gaat ervan uit dat
 * het gesleepte element zélf ook een droppable is — in een sorteerlijst is elk item beide,
 * met hetzelfde id. Hier niet: de posten zijn `useDraggable` (`expense-<id>`) en de
 * maandkolommen zijn `useDroppable` (`month-<maand>`). De laatste stap van die functie is
 *
 *     const activeDroppable = droppableContainers.get(active.id);
 *     if (newNode && newRect && activeDroppable && newDroppable) { ...return coords }
 *     return undefined;
 *
 * en `droppableContainers.get('expense-…')` is hier altijd `undefined`. Ze viel dus door
 * naar `return undefined`, waarna de KeyboardSensor niets te verplaatsen kreeg. Dat is
 * precies wat je zag: oppakken werkte, de live region meldde de bronkolom, Escape
 * annuleerde netjes — en twintig keer pijltje-rechts bewoog niets.
 *
 * Deze versie houdt dezelfde logica (filter op richting, dan `closestCorners`) en laat de
 * sorteer-specifieke voorwaarde weg. De `offset`-correctie van het origineel valt ook weg:
 * die corrigeert voor twee items van verschillende hoogte binnen één sorteercontainer, en
 * dat geval bestaat hier niet.
 *
 * Uitgeschakelde droppables blijven overgeslagen, dus een afgesloten maand blijft geen
 * geldig doelwit — dezelfde garantie als bij het muispad.
 */
const RICHTINGEN: string[] = [KeyboardCode.Down, KeyboardCode.Right, KeyboardCode.Up, KeyboardCode.Left];

export const monthColumnCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { active, collisionRect, droppableRects, droppableContainers, over } },
) => {
  if (!RICHTINGEN.includes(event.code)) return undefined;

  event.preventDefault();
  if (!active || !collisionRect) return undefined;

  // Alleen kandidaten die in de ingedrukte richting liggen. Zonder deze filter levert
  // `closestCorners` de kolom waar je al staat en beweegt er nog steeds niets.
  const kandidaten: DroppableContainer[] = [];
  droppableContainers.getEnabled().forEach((entry) => {
    if (!entry || entry.disabled) return;

    const rect = droppableRects.get(entry.id);
    if (!rect) return;

    switch (event.code) {
      case KeyboardCode.Down:
        if (collisionRect.top < rect.top) kandidaten.push(entry);
        break;
      case KeyboardCode.Up:
        if (collisionRect.top > rect.top) kandidaten.push(entry);
        break;
      case KeyboardCode.Left:
        if (collisionRect.left > rect.left) kandidaten.push(entry);
        break;
      case KeyboardCode.Right:
        if (collisionRect.left < rect.left) kandidaten.push(entry);
        break;
    }
  });

  const botsingen = closestCorners({
    active,
    collisionRect,
    droppableRects,
    droppableContainers: kandidaten,
    pointerCoordinates: null,
  });

  let dichtstbijId = getFirstCollision(botsingen, 'id');
  // Sta je al boven de dichtstbijzijnde kolom, neem dan de volgende — anders blijft één
  // pijltje-rechts op dezelfde kolom hangen.
  const tweede = botsingen[1];
  if (dichtstbijId === over?.id && tweede) dichtstbijId = tweede.id;
  if (dichtstbijId == null) return undefined;

  const doelRect = droppableRects.get(dichtstbijId);
  if (!doelRect) return undefined;

  return { x: doelRect.left, y: doelRect.top };
};
