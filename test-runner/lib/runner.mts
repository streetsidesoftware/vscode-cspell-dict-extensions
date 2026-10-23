import { glob } from 'node:fs/promises';
import * as path from 'node:path';
import { run as runTests } from 'node:test';
import { spec } from 'node:test/reporters';
import { inspect } from 'node:util';

export async function run(testGlob: string, cwd: string): Promise<void> {
    // Join relative matches onto `cwd` instead of resolving them. On Windows, a resolved path has an upper case
    // drive letter (`D:\`) while VSCode loads the suite as `d:\`. Node caches modules by exact path,
    // so the mismatch would load a second copy of `helper.mts` and `logger.mts`.
    const files = (await Array.fromAsync(glob(testGlob, { cwd }))).map((f) => path.join(cwd, f));

    console.log('files: %o', files);

    // With `isolation: 'none'`, node:test ends the stream on the process's `beforeExit`, which the extension host
    // never emits. Every file is imported before the first test starts, so the run is done when the last
    // top-level test completes.
    const stream = runTests({ files, isolation: 'none' });
    stream.compose(spec).pipe(process.stdout);

    let pending = 0;
    let failures = 0;
    await new Promise<void>((resolve) => {
        stream.on('test:enqueue', (event) => {
            if (event.nesting === 0) pending++;
        });
        stream.on('test:complete', (event) => {
            if (!event.details.passed && event.details.type !== 'suite') {
                // The spec reporter lists the failures in its summary, which never comes.
                failures++;
                console.error('✖ %s\n%s', event.name, inspect(event.details.error?.cause ?? event.details.error));
            }
            if (event.nesting === 0 && --pending === 0) resolve();
        });
    });

    if (failures > 0) {
        throw Error(`${failures} tests failed.`);
    }
}
