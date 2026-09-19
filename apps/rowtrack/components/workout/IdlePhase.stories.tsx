import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useArgs } from 'storybook/preview-api';
import { TOESTEL } from '../../.storybook/toestel';
import { IdlePhase } from './IdlePhase';
import type { FoundDevice } from '@/lib/ble/types';
import type { GoalType } from '@/lib/workout-goals';

/**
 * De argTypes met `options` zijn de variant-assen: `bleStatus` en `hrStatus` (de twee
 * toestelrijen), `idleGoalType` (welk doelblok onder de segments verschijnt) en `picking`
 * (welk toesteltype de keuze-sheet toont). Booleans heeft dit component niet.
 *
 * Twee van die assen zijn nullable in het type: `idleGoalType: null` is het "Geen"-segment
 * (vrij trainen) en `picking: null` betekent dat de sheet dicht is. De `options` bevatten
 * alleen de echte literals — de null-kant staat als aparte story hieronder.
 *
 * De picker-index, de chips en het "actief"-vinkje zijn interne state van het component; de
 * suggestie-chips komen uit `useRecentGoals`. Zonder ingelogde gebruiker levert die hook een
 * lege lijst en vult het component de drie chips met zijn defaults — dat is de lege toestand
 * en wat de stories tonen.
 *
 * `insets` staat op nul: Storybook heeft geen notch, en een safe-area-waarde is een
 * toestelmaat, geen designtoken.
 */
const roeitrainers: FoundDevice[] = [
  { id: 'pm5-4821', name: 'Concept2 PM5 4821', rssi: -48 },
  { id: 's4-0118', name: 'WaterRower S4', rssi: -72 },
];

const hartslagbanden: FoundDevice[] = [
  { id: 'polar-h10', name: 'Polar H10 8A2F41', rssi: -52 },
  { id: 'hrm-pro', name: 'Garmin HRM-Pro 3117', rssi: -77 },
];

const geenInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const meta = {
  title: 'Componenten/IdlePhase',
  component: IdlePhase,
  argTypes: {
    bleStatus: {
      control: 'select',
      options: [
        'idle',
        'scanning',
        'connecting',
        'discovering',
        'connected',
        'disconnecting',
        'reconnecting',
        'error',
      ],
    },
    hrStatus: { control: 'select', options: ['idle', 'scanning', 'waiting', 'connected', 'error'] },
    idleGoalType: { control: 'select', options: ['duration', 'distance', 'split', 'watts'] },
    // De streefwaarde die de ouder vasthoudt. Bewust een tekst-control en géén `options`: dan
    // zou `scripts/story-axes.mjs` er een variant-as van maken en zou `figma:check` een
    // component-set met vier assen verwachten waar er twee horen. Een lege waarde betekent
    // "nog niets gekozen" en laat de picker op zijn standaardstand staan.
    idleGoalInput: { control: 'text' },
    idleDurMin: { control: 'text' },
    idleDurSec: { control: 'text' },
    picking: { control: 'select', options: ['rower', 'hr'] },
    devices: { control: 'object' },
    insets: { control: 'object' },
    onConnect: { control: false },
    onDisconnect: { control: false },
    onHRConnect: { control: false },
    onHRDisconnect: { control: false },
    onSelectDevice: { control: false },
    onCancelSelection: { control: false },
    setIdleGoalType: { control: false },
    setIdleGoalInput: { control: false },
    setIdleDurMin: { control: false },
    setIdleDurSec: { control: false },
    onStart: { control: false },
  },
  args: {
    bleStatus: 'connected',
    deviceName: 'Concept2 PM5 4821',
    onConnect: () => {},
    onDisconnect: () => {},
    hrStatus: 'connected',
    hrDeviceName: 'Polar H10 8A2F41',
    hrError: null,
    onHRConnect: () => {},
    onHRDisconnect: () => {},
    devices: roeitrainers,
    picking: null,
    onSelectDevice: () => {},
    onCancelSelection: () => {},
    idleGoalType: 'duration',
    setIdleGoalType: () => {},
    idleGoalInput: '',
    setIdleGoalInput: () => {},
    idleDurMin: '',
    idleDurSec: '',
    setIdleDurMin: () => {},
    setIdleDurSec: () => {},
    onStart: () => {},
    insets: geenInsets,
  },
  /**
   * De picker is sinds F2 (PR umanex-apps#493) GECONTROLEERD: de wielindex wordt afgeleid uit
   * de waarde die de ouder vasthoudt. Met `() => {}` als setters komt die waarde in Storybook
   * nooit terug, dus een chip-tik of een wielbeweging veranderde niets — de catalogus toonde
   * een dode picker terwijl de app werkt.
   *
   * Deze decorator sluit de lus door de setters naar de args te laten schrijven. Hij voegt
   * GEEN DOM-node toe (hij rendert `<Story>` met andere args, niet in een wrapper), dus de
   * geometrie die `parity` en de bouwspec meten blijft ongewijzigd. En de setters blijven in
   * `argTypes` op `control: false` staan: `story-axes.mjs` zou er anders een variant-as uit
   * afleiden.
   */
  decorators: [
    (Story, ctx) => {
      const [, updateArgs] = useArgs();
      return (
        <Story
          args={{
            ...ctx.args,
            setIdleGoalType: (type: GoalType | null) => updateArgs({ idleGoalType: type }),
            setIdleGoalInput: (v: string) => updateArgs({ idleGoalInput: v }),
            setIdleDurMin: (v: string) => updateArgs({ idleDurMin: v }),
            setIdleDurSec: (v: string) => updateArgs({ idleDurSec: v }),
          }}
        />
      );
    },
  ],
  parameters: {
    figma: { url: 'https://www.figma.com/design/QkRgMc7Quqtbow71DiYa1n/RowTrack%20-%20%20Design%20System?node-id=2020-13918' },
    // Zie ActivePhase: een scherm rendert full-bleed op toestelmaat. Hier telt het extra —
    // de full-bleed-truc in GoalHeader rekent met `useWindowDimensions()`, dus in een
    // decorator van 303 px liep dat element 127 px buiten zijn container.
    toestel: TOESTEL.portret,
  },
} satisfies Meta<typeof IdlePhase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** De story waarop de parity-as joint: één story, alle args in meta. */
export const Playground: Story = {};

/** De null-kant van `idleGoalType`: het "Geen"-segment, met de vrij-trainen-regel in plaats van een picker. */
export const ZonderDoel: Story = {
  args: { idleGoalType: null },
};

/** Afstandsdoel: chips op 2, 5 en 10 km, wielpicker in meters. */
export const DoelAfstand: Story = {
  args: { idleGoalType: 'distance' },
};

/**
 * Het doel van de vorige training, onthouden. De wielpicker staat op 10 km omdat de ouder die
 * waarde vasthoudt — niet op de standaard 5 km — en de bijbehorende chip licht op.
 *
 * Dit is de renderkant van F2: tot 2026-09-16 hield dit component zijn eigen index bij, dus
 * bij een remount toonde het scherm 5 km terwijl Start 10 km reed. Met een gecontroleerde
 * picker kan die twee niet meer uit elkaar lopen; deze story is wat dat zichtbaar maakt.
 */
export const DoelAfstandOnthouden: Story = {
  args: { idleGoalType: 'distance', idleGoalInput: '10000' },
};

/** Splitdoel: chips op 2:00, 2:10 en 2:20 per 500 m. */
export const DoelSplit: Story = {
  args: { idleGoalType: 'split' },
};

/** Vermogensdoel: chips op 150, 180 en 200 W. */
export const DoelVermogen: Story = {
  args: { idleGoalType: 'watts' },
};

/** Vertreksituatie: geen trainer, geen band — beide rijen tonen "Verbinden". */
export const NietVerbonden: Story = {
  args: {
    bleStatus: 'idle',
    deviceName: null,
    hrStatus: 'idle',
    hrDeviceName: null,
  },
};

/** Loading: de trainerrij draait en de actie is uitgeschakeld zolang de scan loopt. */
export const Verbinden: Story = {
  args: { bleStatus: 'scanning', deviceName: null },
};

/** Fout: de trainerrij kleurt rood en biedt "Opnieuw" aan. */
export const Fout: Story = {
  args: { bleStatus: 'error', deviceName: null },
};

/**
 * Hartslagfout: de rij valt terug op "Verbinden", met de reden eronder. Zonder die regel is
 * een mislukte scan niet te onderscheiden van een dode knop.
 */
export const HartslagFout: Story = {
  args: {
    hrStatus: 'error',
    hrDeviceName: null,
    hrError: 'Geen hartslagmeter gevonden — zet de band om en probeer opnieuw',
  },
};

/**
 * Tussenstand van de band: verbonden, maar er is nog geen hartslag binnengekomen.
 * Bewust niet groen — dat zou "het werkt" beweren.
 */
export const HartslagWacht: Story = {
  args: { hrStatus: 'waiting' },
};

/** Twee trainers in de zaal: de keuze-sheet schuift over het scherm. */
export const ToestelKeuze: Story = {
  args: { picking: 'rower', bleStatus: 'scanning', deviceName: null },
};

/** Dezelfde sheet voor de hartslagband, met hart-icoon en eigen titel. */
export const HartslagKeuze: Story = {
  args: {
    picking: 'hr',
    devices: hartslagbanden,
    hrStatus: 'scanning',
    hrDeviceName: null,
  },
};
