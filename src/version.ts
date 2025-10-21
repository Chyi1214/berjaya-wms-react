// Single source of truth for application version
// Automatically synced from package.json - NO MANUAL UPDATES NEEDED!
// Just update version in package.json and it will reflect here

import packageJson from '../package.json';

export const APP_VERSION = packageJson.version;
