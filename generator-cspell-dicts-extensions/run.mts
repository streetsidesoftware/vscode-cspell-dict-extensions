#!/usr/bin/env node

import { styleText } from 'node:util';

import { run } from './src/app.mts';

try {
    await run();
} catch (e) {
    console.error(styleText('red', `\n${e instanceof Error ? e.message : String(e)}`));
    process.exitCode = 1;
}
