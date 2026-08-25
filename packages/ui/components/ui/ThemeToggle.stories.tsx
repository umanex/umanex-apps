import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeToggle } from './ThemeToggle';
import source from './ThemeToggle.tsx?raw';

const meta = {
  title: 'Componenten/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    tokens: { source },
    docs: {
      description: {
        component:
          'Schakelt de `dark`-class op `<html>` — dezelfde class die de Theme-knop in de Storybook-toolbar zet. ' +
          'Klik je hier, dan wisselt het canvas mee; de toolbar-stand loopt dan één stap achter tot je hem opnieuw kiest.',
      },
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
