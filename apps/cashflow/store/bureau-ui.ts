import { create } from 'zustand';

type BureauUiState = {
  /** Het boekjaar waar alle bureau-pagina's op rekenen. Nooit opgeslagen — altijd dit jaar bij het openen. */
  year: number;
  setYear: (year: number) => void;
  /** Tekst voor de live-regio van de bureau-layout: wat een schrijfactie net deed. */
  announcement: string;
  announce: (text: string) => void;
};

export const useBureauUi = create<BureauUiState>()((set) => ({
  year: new Date().getFullYear(),
  setYear: (year) => set({ year }),
  announcement: '',
  // Een lege tussenstand zorgt dat twee keer dezelfde melding ook twee keer voorgelezen wordt.
  announce: (text) => {
    set({ announcement: '' });
    setTimeout(() => set({ announcement: text }), 50);
  },
}));
