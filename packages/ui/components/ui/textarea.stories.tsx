import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent } from 'storybook/test';
import { Textarea } from './textarea';
import { Label } from './label';
import source from './textarea.tsx?raw';

const meta = {
  title: 'Componenten/Textarea',
  component: Textarea,
  parameters: {
    tokens: { source },
    figma: { url: 'https://www.figma.com/design/ko2OuasYxyY2YRD69MYhWX/Component-library?node-id=95-10' },
  },
  argTypes: {
    disabled: { control: 'boolean' },
    size: { control: 'radio', options: ['default', 'sm'] },
  },
  args: { placeholder: 'Wat is de concrete aanleiding?', disabled: false, size: 'default' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <Textarea className="w-80" {...args} />,
};

/** `sm` haalt de vloer van 80px weg en zet de padding op 6px; de hoogte komt van `rows`. */
export const Maten: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Textarea rows={2} defaultValue="Standaard: vloer van 80px." />
      <Textarea size="sm" rows={2} defaultValue="sm: twee regels, compact." />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <Label htmlFor="scope">Scope</Label>
      <Textarea id="scope" placeholder="Wat valt binnen de opdracht, en wat niet?" />
    </div>
  ),
  play: async ({ canvas }) => {
    const veld = canvas.getByLabelText('Scope');
    await userEvent.type(veld, 'Twee workflows, geen migratie.');
    await expect(veld).toHaveValue('Twee workflows, geen migratie.');
  },
};

export const States: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Textarea placeholder="Leeg" />
      <Textarea defaultValue={'Met waarde\nover twee regels'} />
      <Textarea placeholder="Uitgeschakeld" disabled />
    </div>
  ),
};
