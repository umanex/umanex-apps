import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { Label } from './label';
import source from './input.tsx?raw';

const meta = {
  title: 'Componenten/Input',
  component: Input,
  parameters: {
    tokens: { source },
    figma: { url: 'https://www.figma.com/design/ko2OuasYxyY2YRD69MYhWX/Component-library?node-id=27-413' },
  },
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search', 'file'] },
    disabled: { control: 'boolean' },
    size: { control: 'radio', options: ['default', 'sm'] },
  },
  args: { type: 'text', placeholder: 'Bedrijfsnaam', disabled: false, size: 'default' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <Input className="w-72" {...args} />,
};

/** `sm` (36px) is de compacte maat die consumenten tot 2026-09-17 zelf nabouwden. */
export const Maten: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Input placeholder="Standaard, 40px" />
      <Input size="sm" placeholder="sm, 36px" />
    </div>
  ),
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
