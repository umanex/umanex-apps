const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch alle files binnen de monorepo (zodat wijzigingen in packages/* live reloaden)
config.watchFolders = [workspaceRoot];

// 2. Vertel Metro waar het packages mag resolven, en in welke volgorde
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Hierarchical lookup blijft AAN. pnpm's geïsoleerde layout zet de dependencies
//    van een package naast dat package in .pnpm/, dus Metro moet vanaf het
//    importerende bestand omhoog kunnen lopen. Zet je dit uit, dan valt bijvoorbeeld
//    `whatwg-fetch` (dep van @expo/metro-runtime) niet meer te resolven.
//    De oude reden om het uit te zetten — per ongeluk een tweede React vinden —
//    bestaat niet meer: elke app resolvet zijn eigen react uit zijn eigen node_modules.

module.exports = config;