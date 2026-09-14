import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TOESTEL } from '../../.storybook/toestel';
import { vulEnVerstuur } from '../../.storybook/formulier';
import LoginScreen from './login';

/**
 * Het inlogscherm heeft geen props: alles is interne state. De stories tonen daarom de
 * toestanden die de gebruiker doorloopt, niet varianten van een as — er ís geen as.
 *
 * `signIn` raakt de gemockte supabase, dus de knop doet in Storybook niets destructiefs.
 */
const meta = {
  title: 'Componenten/LoginScreen',
  component: LoginScreen,
  parameters: { toestel: TOESTEL.portret },
} satisfies Meta<typeof LoginScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Leeg formulier — de story waarop de parity-as joint. */
export const Playground: Story = {};

/**
 * De foutvorm, en de enige manier om hem te zien: het scherm houdt hem in `useState` ná een
 * submit, dus een story moet die submit werkelijk doorlopen. `parameters.supabase.authFout`
 * laat de gemockte GoTrue een echte fout teruggeven; de `play` hieronder vult het formulier en
 * drukt op de knop. Er is dus géén prop of dev-tak in de productiecode die van stories weet.
 *
 * De waarde gaat via de native setter: React luistert naar zijn eigen `input`-event en een
 * kale `el.value = …` bereikt de state niet.
 */
export const MetFout: Story = {
  parameters: { toestel: TOESTEL.portret, supabase: { authFout: 'ongeldig' } },
  play: async ({ canvasElement }) => {
    await vulEnVerstuur(canvasElement, ['roeier@umanex.be', 'verkeerdwachtwoord'], 'Log in');
  },
};
