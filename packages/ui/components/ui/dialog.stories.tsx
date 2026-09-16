import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import source from './dialog.tsx?raw';

// `title` en `description` zijn geen props van DialogContent maar tekst die per gebruiksplek
// verschilt. Als string-arg worden ze in Figma een tekst-property op de component, in plaats
// van vaste voorbeeldtekst die elke instance meesleept.
type PlaygroundArgs = ComponentProps<typeof DialogContent> & {
  title: string;
  description: string;
};

const meta: Meta<PlaygroundArgs> = {
  title: 'Componenten/Dialog',
  component: DialogContent,
  parameters: {
    tokens: { source },
    figma: { url: 'https://www.figma.com/design/ko2OuasYxyY2YRD69MYhWX/Component-library?node-id=107-33' },
    // Modaal: de verduistering zou de docs-pagina bedekken. In een eigen iframe blijft ze binnen de story.
    docs: { story: { inline: false, iframeHeight: 480 } },
  },
  args: {
    title: 'Project archiveren',
    description: 'Het project verdwijnt uit het overzicht. Je kunt het later terugzetten.',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Open bij het laden — de Content is wat in Figma de component is, niet de trigger. */
export const Playground: Story = {
  render: ({ title, description, ...args }) => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button variant="outline">Project archiveren</Button>
      </DialogTrigger>
      <DialogContent {...args}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuleren</Button>
          </DialogClose>
          <Button>Archiveren</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/** Openen via de trigger en sluiten via de sluitknop; de dialoog portalt naar `body`. */
export const OpenenEnSluiten: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Details bekijken</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Factuur 2026-041</DialogTitle>
          <DialogDescription>Verzonden op 3 september, vervalt op 3 oktober.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Details bekijken' }));
    const body = within(canvasElement.ownerDocument.body);
    const dialoog = await body.findByRole('dialog', { name: 'Factuur 2026-041' });
    await expect(dialoog).toBeVisible();
    await userEvent.click(body.getByRole('button', { name: 'Sluiten' }));
    // Radix houdt de node vast tot de sluit-animatie klaar is — wachten, niet meteen toetsen.
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};
