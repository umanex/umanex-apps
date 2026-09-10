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
  },
  args: { children: 'Actief', variant: 'default' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

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
