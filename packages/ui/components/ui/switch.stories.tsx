import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent } from 'storybook/test';
import { Switch } from './switch';
import { Label } from './label';
import source from './switch.tsx?raw';

const meta = {
  title: 'Componenten/Switch',
  component: Switch,
  parameters: {
    tokens: { source },
  },
  // `checked` en `disabled` zijn de twee assen die de vorm veranderen, dus ook de twee
  // variant-assen in Figma (2 × 2 = 4 varianten). Hover en focus zijn bewust geen as.
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { checked: false, disabled: false },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Args = de Figma-assen. De switch staat er precies één keer in; het label hoort er niet bij. */
export const Playground: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Switch id="playground" {...args} />
      <Label htmlFor="playground">Meldingen per e-mail</Label>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Switch id="uit" />
        <Label htmlFor="uit">Uit</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="aan" defaultChecked />
        <Label htmlFor="aan">Aan</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="uitgeschakeld" disabled />
        <Label htmlFor="uitgeschakeld">Uitgeschakeld</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="uitgeschakeld-aan" disabled defaultChecked />
        <Label htmlFor="uitgeschakeld-aan">Uitgeschakeld en aan</Label>
      </div>
    </div>
  ),
};

/** Klikken op het label schakelt de switch om; de toestand leest een schermlezer als `aria-checked`. */
export const Omschakelen: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="omschakelen" />
      <Label htmlFor="omschakelen">Donkere modus</Label>
    </div>
  ),
  play: async ({ canvas }) => {
    const knop = canvas.getByRole('switch', { name: 'Donkere modus' });
    await expect(knop).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(canvas.getByText('Donkere modus'));
    await expect(knop).toHaveAttribute('aria-checked', 'true');
  },
};
