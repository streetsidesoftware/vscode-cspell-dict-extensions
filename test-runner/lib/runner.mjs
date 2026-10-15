import { glob } from 'node:fs/promises';
import * as path from 'node:path';

import Mocha from 'mocha';

export async function run(testGlob, cwd) {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
    });

    // Join relative matches onto `cwd` instead of resolving them. On Windows, a resolved path has an upper case
    // drive letter (`D:\`) while VSCode loads the suite as `d:\`. Node caches modules by exact path,
    // so the mismatch would load a second copy of `helper.cjs` and `logger.cjs`.
    const files = (await Array.fromAsync(glob(testGlob, { cwd }))).map((f) => path.join(cwd, f));

    console.log('files: %o', files);

    // Add files to the test suite
    files.forEach((f) => mocha.addFile(f));

    await mocha.loadFilesAsync();

    return new Promise((resolve, reject) => {
        // Run the mocha test
        mocha.run((failures) => {
            if (failures > 0) {
                reject(Error(`${failures} tests failed.`));
            } else {
                resolve();
            }
        });
    });
}
