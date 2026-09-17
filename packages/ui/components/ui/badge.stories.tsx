import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';
import source from './badge.tsx?raw';

const meta = {
  title: 'Componenten/Badge',
  component: Badge,
  parameters: {
    tokens: { source },
    figma: { url: 'https://www.figma.com/design/ko2OuasYxyY2YRD69MYhWX/Component-library?node-id=27-393' },
  },
  argTypes: {
    variant: { control: 'select', options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'] },
    size: { control: 'radio', options: ['default', 'sm'] },
  },
  args: { children: 'Actief', variant: 'default', size: 'default' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** `sm` is de compacte maat die consumenten tot 2026-09-17 met `className="text-2xs"` nabouwden. */
export const Maten: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Default</Badge>
      <Badge size="sm">Default sm</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="outline" size="sm">
        Outline sm
      </Badge>
      <Badge variant="warning" size="sm">
        wacht op input
      </Badge>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="success">Betaald</Badge>
      <Badge variant="warning">Uitgesteld</Badge>
      <Badge variant="destructive">Vervallen</Badge>
    </div>
  ),
};
