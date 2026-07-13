const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo
config.watchFolders = [workspaceRoot];

const reactNativePath = path.dirname(require.resolve('react-native/package.json', { paths: [workspaceRoot] }));

// Resolve modules from both app and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(reactNativePath, 'node_modules'),
];

// Ensure Metro resolves from workspace root first for hoisted packages
config.resolver.disableHierarchicalLookup = true;

// Override serverRoot to projectRoot so relative entry file resolves correctly
// on Windows builds (Expo default sets this to monorepo root, breaking Gradle builds)
config.server = config.server ?? {};
config.server.unstable_serverRoot = projectRoot;

module.exports = config;
