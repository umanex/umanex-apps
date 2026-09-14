import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TOESTEL } from '../../.storybook/toestel';
import { vulEnVerstuur } from '../../.storybook/formulier';
import ForgotPasswordScreen from '@/app/(auth)/forgot-password';

/** Wachtwoord vergeten: één veld en een terugweg naar inloggen. */
const meta = {
  title: 'Componenten/ForgotPasswordScreen',
  component: ForgotPasswordScreen,
  parameters: { toestel: TOESTEL.portret },
} satisfies Meta<typeof ForgotPasswordScreen>;

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
  parameters: { toestel: TOESTEL.portret, supabase: { authFout: 'ongeldig' } },
  play: async ({ canvasElement }) => {
    await vulEnVerstuur(canvasElement, ['roeier@umanex.be'], 'Stuur reset-link');
  },
};
