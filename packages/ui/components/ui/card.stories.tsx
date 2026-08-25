import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import source from './card.tsx?raw';

const meta = {
  title: 'Componenten/Card',
  component: Card,
  parameters: { tokens: { source } },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Maandoverzicht</CardTitle>
        <CardDescription>Inkomsten en uitgaven van augustus.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Nog drie facturen open, samen 4.250 euro.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Bekijken</Button>
        <Button size="sm" variant="outline">
          Exporteren
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent className="pt-6">
        <p className="text-sm">Een kaart zonder header of footer.</p>
      </CardContent>
    </Card>
  ),
};
