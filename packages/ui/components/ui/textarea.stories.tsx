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
  },
  args: { placeholder: 'Wat is de concrete aanleiding?', disabled: false },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <Textarea className="w-80" {...args} />,
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
