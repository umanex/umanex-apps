import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import source from './tabs.tsx?raw';

const meta = {
  title: 'Componenten/Tabs',
  component: Tabs,
  parameters: { tokens: { source } },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overzicht" className="w-96">
      <TabsList>
        <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
        <TabsTrigger value="facturen">Facturen</TabsTrigger>
        <TabsTrigger value="instellingen" disabled>
          Instellingen
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overzicht" className="text-sm text-muted-foreground">
        Het overzicht van deze maand.
      </TabsContent>
      <TabsContent value="facturen" className="text-sm text-muted-foreground">
        Drie openstaande facturen.
      </TabsContent>
    </Tabs>
  ),
};
