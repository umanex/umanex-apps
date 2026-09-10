import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './slider';
import source from './slider.tsx?raw';

const meta = {
  title: 'Componenten/Slider',
  component: Slider,
  parameters: {
    tokens: { source },
    figma: { url: 'https://www.figma.com/design/ko2OuasYxyY2YRD69MYhWX/Component-library?node-id=27-443' },
  },
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    disabled: { control: 'boolean' },
  },
  args: { defaultValue: [40], min: 0, max: 100, step: 1, disabled: false },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <Slider className="w-72" {...args} />,
};

export const Range: Story = {
  render: () => <Slider className="w-72" defaultValue={[20, 60]} />,
};

export const Disabled: Story = {
  render: () => <Slider className="w-72" defaultValue={[40]} disabled />,
};
