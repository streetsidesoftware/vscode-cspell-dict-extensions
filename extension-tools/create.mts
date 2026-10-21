#!/usr/bin/env node

import { styleText } from 'node:util';

import { run } from './src/create/app.mts';
import { isExitPromptError } from './src/create/prompt.mts';

try {
    await run();
} catch (e) {
    if (isExitPromptError(e)) {
        // The user pressed Ctrl+C.
        process.exitCode = 130;
    } else {
        console.error(styleText('red', `\n${e instanceof Error ? e.message : String(e)}`, { stream: process.stderr }));
        process.exitCode = 1;
    }
}
