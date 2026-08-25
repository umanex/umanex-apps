import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { Label } from './label';
import source from './label.tsx?raw';

const meta = {
  title: 'Componenten/Label',
  component: Label,
  parameters: { tokens: { source } },
  args: { children: 'Naam' },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithControl: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Naam</Label>
        <Input id="name" placeholder="Voornaam Achternaam" />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="newsletter" disabled />
        <Label htmlFor="newsletter">Nieuwsbrief (peer-disabled)</Label>
      </div>
    </div>
  ),
};
