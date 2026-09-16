import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent } from 'storybook/test';
import { NativeSelect } from './native-select';
import { Label } from './label';
import source from './native-select.tsx?raw';

const meta = {
  title: 'Componenten/NativeSelect',
  component: NativeSelect,
  parameters: {
    tokens: { source },
    figma: { url: 'https://www.figma.com/design/ko2OuasYxyY2YRD69MYhWX/Component-library?node-id=95-20' },
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: { disabled: false, defaultValue: 'workflowtraject' },
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const aanbod = (
  <>
    <option value="productdiagnose">Productdiagnose (scan)</option>
    <option value="conceptvalidatie">Conceptvalidatie</option>
    <option value="workflowtraject">Workflowtraject</option>
    <option value="design-system">Design system</option>
    <option value="productbegeleiding">Productbegeleiding</option>
    <option value="overig">Overig</option>
  </>
);

export const Playground: Story = {
  render: (args) => (
    <NativeSelect wrapperClassName="w-80" {...args}>
      {aanbod}
    </NativeSelect>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <Label htmlFor="aanbod">Type aanbod</Label>
      <NativeSelect id="aanbod" defaultValue="productdiagnose">
        {aanbod}
      </NativeSelect>
    </div>
  ),
  play: async ({ canvas }) => {
    const lijst = canvas.getByLabelText('Type aanbod');
    await userEvent.selectOptions(lijst, 'design-system');
    await expect(lijst).toHaveValue('design-system');
  },
};

export const States: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <NativeSelect defaultValue="">
        <option value="" disabled>
          Kies een categorie
        </option>
        <option value="klantwerk">Klantwerk</option>
      </NativeSelect>
      <NativeSelect defaultValue="workflowtraject">{aanbod}</NativeSelect>
      <NativeSelect defaultValue="overig" disabled>
        {aanbod}
      </NativeSelect>
    </div>
  ),
};
