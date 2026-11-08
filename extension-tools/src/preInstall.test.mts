import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

/**
 * The files workflows run before `npm ci`, directly or through `scripts/`: nothing is installed yet, so everything
 * they load must be built into Node. A package can still be loaded later with `await import()`, or named in
 * `import type`, which Node erases.
 */
const entryPoints = ['api-node-only.mts', 'set-prerelease-mode.mts'];

const staticImport = /^(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s+'([^']+)'/gm;
const sideEffectImport = /^import\s+'([^']+)'/gm;

describe('the files workflows run before npm ci', () => {
    for (const entryPoint of entryPoints) {
        it(`${entryPoint} loads only node: modules`, async () => {
            const packages = await packageImports(path.join(import.meta.dirname, '..', entryPoint));
            assert.deepEqual(
                packages.filter((specifier) => !specifier.startsWith('node:')),
                [],
            );
        });
    }
});

/** The packages a file loads at the top, through its relative imports too. */
async function packageImports(file: string, seen = new Set<string>()): Promise<string[]> {
    if (seen.has(file)) return [];
    seen.add(file);
    const source = await readFile(file, 'utf8');
    const specifiers = [...source.matchAll(staticImport), ...source.matchAll(sideEffectImport)].map(
        (match) => match[1]!,
    );
    const packages: string[] = [];
    for (const specifier of specifiers) {
        if (!specifier.startsWith('.')) {
            packages.push(specifier);
            continue;
        }
        for (const found of await packageImports(path.resolve(path.dirname(file), specifier), seen))
            packages.push(found);
    }
    return packages;
}
