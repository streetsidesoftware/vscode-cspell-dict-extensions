#!/usr/bin/env node

/**
 * Check the files git tracks for the on/off wording that `docs/style.md` rules out, and print each phrase with its fix:
 *
 * ```
 * extension-tools/src/drift.mts:13:22: "turns on" → write "enable"
 * ```
 *
 * Exits with 1 when it finds any. `knownExceptions` in `lib/wording.mts` lists the phrases allowed for now. An exception
 * whose phrase is gone fails too, so the list stays current.
 */

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { repoRoot } from './lib/repo.mts';
import { findWordingProblems, isChecked, knownExceptions } from './lib/wording.mts';

const files = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\0')
    .filter((file) => file && isChecked(file));
const allowed = new Set(knownExceptions.map((exception) => `${exception.file}\0${exception.phrase}`));

const used = new Set<string>();
let count = 0;
for (const file of files) {
    const text = await readFile(path.join(repoRoot, file), 'utf8');
    if (text.includes('\0')) continue;
    for (const problem of findWordingProblems(text)) {
        const key = `${file}\0${problem.phrase}`;
        if (allowed.has(key)) {
            used.add(key);
            continue;
        }
        const { line, column } = position(text, problem.index);
        console.log(`${file}:${line}:${column}: "${problem.phrase.replace(/\s+/g, ' ')}" → write "${problem.fix}"`);
        count += 1;
    }
}
for (const exception of knownExceptions) {
    if (used.has(`${exception.file}\0${exception.phrase}`)) continue;
    console.log(
        `${exception.file}: "${exception.phrase}" is gone. Remove it from knownExceptions in scripts/lib/wording.mts.`,
    );
    count += 1;
}
if (count) {
    console.log(
        `\n${count} found. The Wording rule in docs/style.md says to write "enable" and "disable", not "on" and "off".`,
    );
    process.exitCode = 1;
}

/** The 1-based line and column of `index` in `text`. */
function position(text: string, index: number): { line: number; column: number } {
    const before = text.slice(0, index);
    const lineStart = before.lastIndexOf('\n') + 1;
    return { line: before.split('\n').length, column: index - lineStart + 1 };
}
