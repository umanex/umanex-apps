import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './button';
import source from './button.tsx?raw';

const meta = {
  title: 'Componenten/Button',
  component: Button,
  parameters: { tokens: { source } },
  argTypes: {
    variant: { control: 'select', options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] },
    size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] },
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
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Toevoegen">
        <Plus />
      </Button>
    </div>
  ),
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
