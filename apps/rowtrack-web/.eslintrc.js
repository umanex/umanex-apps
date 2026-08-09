module.exports = {
  // require.resolve, geen kale pakketnaam: ESLint 8 verbouwt "@umanex/config" tot
  // "@umanex/eslint-config-config" en vindt hem dan niet.
  //
  // De token-regels komen uit de umanex-config, maar ze zijn niet umanex-specifiek:
  // ze verbieden rauwe paletklassen, hardcoded hex, bg-white/text-black en
  // arbitrary font-sizes/radii. Precies de discipline die deze app ook nodig heeft,
  // ook al draait hij op RowTrack's eigen rollaag. Alleen de var(--umanex*)-regel
  // is hier zonder werking, en dat is onschadelijk.
  extends: ['next/core-web-vitals', require.resolve('@umanex/config/eslint/tokens')],
};
