import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TOESTEL } from '../../.storybook/toestel';
import { vulEnVerstuur } from '../../.storybook/formulier';
import RegisterScreen from './register';

/** Registratie: e-mail, wachtwoord en bevestiging, met veldvalidatie op blur. */
const meta = {
  title: 'Componenten/RegisterScreen',
  component: RegisterScreen,
  parameters: { toestel: TOESTEL.portret },
} satisfies Meta<typeof RegisterScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Leeg formulier — de story waarop de parity-as joint. */
export const Playground: Story = {};

/**
 * De foutvorm. Het scherm houdt zijn serverfout in `useState` ná een submit, dus de story moet
 * die submit werkelijk doorlopen — zie `.storybook/formulier.ts` voor het waarom en de twee
 * valkuilen. `parameters.supabase.authFout` laat de gemockte GoTrue falen; de productiecode
 * weet van niets.
 */
export const MetFout: Story = {
  parameters: { toestel: TOESTEL.portret, supabase: { authFout: 'bestaat-al' } },
  play: async ({ canvasElement }) => {
    await vulEnVerstuur(canvasElement, ['roeier@umanex.be', 'Geheim1234', 'Geheim1234'], 'Maak account');
  },
};
