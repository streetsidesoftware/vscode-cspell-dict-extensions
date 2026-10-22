#!/usr/bin/env node

/**
 * Print which extensions to build and test, as `GITHUB_OUTPUT` lines:
 *
 * ```
 * extensions=["extensions/german",...]
 * shared=false
 * ```
 *
 * Usage: list-affected-extensions.mts [--all]
 *
 * - `--all`: test every extension and the shared code.
 * - Otherwise, read the repo paths of the changed files from stdin, one per line. See `extensionsToTest`.
 */

import { text } from 'node:stream/consumers';
import { parseArgs } from 'node:util';

import { listExtensionRepoPaths } from '../extension-tools/api-node-only.mts';

import { extensionsToTest } from './lib/extensionsToTest.mts';

const { values } = parseArgs({ options: { all: { type: 'boolean', default: false } } });

const extensionRepoPaths = await listExtensionRepoPaths();
const result = values.all
    ? { extensions: extensionRepoPaths, shared: true }
    : extensionsToTest((await text(process.stdin)).split('\n').filter(Boolean), extensionRepoPaths);

console.log(`extensions=${JSON.stringify(result.extensions)}`);
console.log(`shared=${result.shared}`);
