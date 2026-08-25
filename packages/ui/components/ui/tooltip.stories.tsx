import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import source from './tooltip.tsx?raw';

const meta: Meta<typeof TooltipContent> = {
  title: 'Componenten/Tooltip',
  component: TooltipContent,
  parameters: { tokens: { source } },
  argTypes: { side: { control: 'radio', options: ['top', 'right', 'bottom', 'left'] } },
  args: { side: 'top' },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex h-32 items-center justify-center">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover of focus</Button>
      </TooltipTrigger>
      <TooltipContent {...args}>Verstuur de factuur naar de klant</TooltipContent>
    </Tooltip>
  ),
};

export const Open: Story = {
  render: (args) => (
    <Tooltip open>
      <TooltipTrigger asChild>
        <Button variant="outline">Altijd zichtbaar</Button>
      </TooltipTrigger>
      <TooltipContent {...args}>Voor de docs-pagina: geforceerd open</TooltipContent>
    </Tooltip>
  ),
};
