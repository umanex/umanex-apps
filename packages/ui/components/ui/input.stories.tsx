import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { Label } from './label';
import source from './input.tsx?raw';

const meta = {
  title: 'Componenten/Input',
  component: Input,
  parameters: { tokens: { source } },
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search', 'file'] },
    disabled: { control: 'boolean' },
  },
  args: { type: 'text', placeholder: 'Bedrijfsnaam', disabled: false },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <Input className="w-72" {...args} />,
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="email">E-mailadres</Label>
      <Input id="email" type="email" placeholder="jij@voorbeeld.be" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Input placeholder="Leeg" />
      <Input defaultValue="Met waarde" />
      <Input placeholder="Uitgeschakeld" disabled />
      <Input type="file" />
    </div>
  ),
};
