const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

// Include react-native's own node_modules so that packages like
// @react-native/virtualized-lists (a react-native transitive dep) can be found
// when disableHierarchicalLookup is enabled.
const reactNativePath = path.dirname(require.resolve('react-native/package.json', { paths: [workspaceRoot] }));

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(reactNativePath, 'node_modules'),
];

// Prevent Metro from walking UP past projectRoot to find node_modules
config.resolver.disableHierarchicalLookup = true;

// Override serverRoot to projectRoot so that the relative entry file ('index.js')
// resolves correctly on Windows builds where Gradle passes a relative path.
// Without this, Expo's default config sets unstable_serverRoot to the monorepo
// root (workspaceRoot), causing Metro to look for index.js at the wrong level.
config.server = config.server ?? {};
config.server.unstable_serverRoot = projectRoot;

module.exports = config;
