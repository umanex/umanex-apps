import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator';
import source from './separator.tsx?raw';

const meta = {
  title: 'Componenten/Separator',
  component: Separator,
  parameters: { tokens: { source } },
  argTypes: { orientation: { control: 'radio', options: ['horizontal', 'vertical'] } },
  args: { orientation: 'horizontal' },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-72">
      <p className="text-sm font-medium">Instellingen</p>
      <p className="text-sm text-muted-foreground">Beheer je profiel en voorkeuren.</p>
      <Separator className="my-4" />
      <p className="text-sm">Onder de lijn.</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center gap-4 text-sm">
      <span>Blog</span>
      <Separator orientation="vertical" />
      <span>Docs</span>
      <Separator orientation="vertical" />
      <span>Bron</span>
    </div>
  ),
};
