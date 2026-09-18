import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './button';
import source from './button.tsx?raw';

const meta = {
  title: 'Componenten/Button',
  component: Button,
  parameters: {
    tokens: { source },
    figma: { url: 'https://www.figma.com/design/ko2OuasYxyY2YRD69MYhWX/Component-library?node-id=27-374' },
  },
  argTypes: {
    variant: { control: 'select', options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] },
    size: { control: 'select', options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs'] },
    disabled: { control: 'boolean' },
  },
  args: { children: 'Opslaan', variant: 'default', size: 'default', disabled: false },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon-xs" aria-label="Toevoegen, compact">
        <Plus />
      </Button>
      <Button size="icon" aria-label="Toevoegen">
        <Plus />
      </Button>
    </div>
  ),
};

/**
 * De dichtste maat: 28px hoog, dertien-pixeltekst. Bedoeld voor een rij die zich herhaalt — de
 * ledger van cashflow — niet voor een losse actie op een pagina.
 */
export const ExtraSmall: Story = {
  args: { size: 'xs', children: 'Afsluiten' },
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        <Plus /> Nieuwe post
      </Button>
      <Button variant="destructive">
        <Trash2 /> Verwijderen
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Niet beschikbaar' },
};

/** `asChild`: het kind (hier een link) krijgt de knopklassen; er komt geen `<button>` omheen. */
export const AsChild: Story = {
  render: () => (
    <Button asChild variant="outline">
      <a href="#documentatie">Naar de documentatie</a>
    </Button>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Naar de documentatie' });
    await expect(link.tagName).toBe('A');
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};
