import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './checkbox';
import { Label } from './label';
import source from './checkbox.tsx?raw';

const meta = {
  title: 'Componenten/Checkbox',
  component: Checkbox,
  parameters: { tokens: { source } },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { disabled: false },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="playground" {...args} />
      <Label htmlFor="playground">Voorwaarden aanvaarden</Label>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id="unchecked" />
        <Label htmlFor="unchecked">Niet aangevinkt</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="checked" defaultChecked />
        <Label htmlFor="checked">Aangevinkt</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="disabled" disabled />
        <Label htmlFor="disabled">Uitgeschakeld</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="disabled-checked" disabled defaultChecked />
        <Label htmlFor="disabled-checked">Uitgeschakeld en aangevinkt</Label>
      </div>
    </div>
  ),
};
