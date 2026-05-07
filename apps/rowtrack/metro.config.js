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

// 3. Force Metro om alleen via die paden te resolven
//    Dit voorkomt dat het per ongeluk een tweede React vindt in een nested node_modules
config.resolver.disableHierarchicalLookup = true;

module.exports = config;