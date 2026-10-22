#!/usr/bin/env node

/**
 * Give every extension's `package.json` the fields the extensions share, and sort it.
 */

import { fixExtensions } from './src/fixExtensions.mts';

await fixExtensions();
