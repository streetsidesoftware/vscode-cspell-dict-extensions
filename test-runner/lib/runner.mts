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

    // The tests must run in this process, the extension host, because only it can import `vscode`.
    // The default isolation would run each file in a plain Node child process.
    const stream = runTests({ files, isolation: 'none' });
    stream.compose(spec).pipe(process.stdout);

    // Don't wait for the stream to end: it never does here.
    // With `isolation: 'none'`, node:test finishes the run in a `beforeExit` handler.
    // That handler reports the summary and ends the stream.
    // `beforeExit` only fires when the event loop is empty, and the extension host always has work queued.
    // (Node 24: `setupProcessState` in `lib/internal/test_runner/harness.js`.)
    //
    // Instead, count the top-level tests and stop when the last one completes.
    // This relies on internal behavior of `run()`: it imports every file before it starts the first test
    // (`runFiles` in `lib/internal/test_runner/runner.js`).
    // Each top-level `suite` or `test` sends `test:enqueue` while its file is imported.
    // So every top-level test is counted before any completes, and `pending` only reaches 0 at the end.
    // If a Node release changes this order, the run could end early or hang.
    let pending = 0;
    let failures = 0;
    await new Promise<void>((resolve) => {
        stream.on('test:enqueue', (event) => {
            if (event.nesting === 0) pending++;
        });
        stream.on('test:complete', (event) => {
            // A suite fails when one of its tests fails, so count only the tests.
            if (!event.details.passed && event.details.type !== 'suite') {
                failures++;
                // The spec reporter prints the failures' details in its summary, which never comes, so print them here.
                // node:test wraps the thrown error, and `cause` is the original one, with its stack.
                // Format it as text: the extension host's console turns an object into a single quoted line.
                console.error('✖ %s\n%s', event.name, inspect(event.details.error?.cause ?? event.details.error));
            }
            if (event.nesting === 0 && --pending === 0) resolve();
        });
    });

    if (failures > 0) {
        throw Error(`${failures} tests failed.`);
    }
}
