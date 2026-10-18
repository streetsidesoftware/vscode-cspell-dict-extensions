#!/usr/bin/env node

/**
 * Print the extension directories as a JSON array on one line, i.e. `["extensions/ancient-greek",...]`.
 *
 * Workflows write the output to `GITHUB_OUTPUT` or `GITHUB_ENV`.
 */

import { listExtensionRepoPaths } from './lib/repo.mts';

console.log(JSON.stringify(await listExtensionRepoPaths()));
