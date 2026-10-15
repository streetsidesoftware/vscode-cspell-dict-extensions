import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { glob } from 'glob';
import Mocha from 'mocha';

// Import side effects from initEsmImports to setup esmImports.
import './initEsmImports.mjs';

export async function run(testGlob, cwd) {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'bdd',
        color: true,
    });

    // Join relative matches onto `cwd` instead of using `absolute: true`. On Windows, glob returns
    // an upper case drive letter (`D:\`) while VSCode loads the suite as `d:\`. Node caches modules by exact path,
    // so the mismatch would load a second copy of `esmImport.cjs` that was never initialized.
    const files = (await glob(testGlob, { cwd })).map((f) => path.join(cwd, f));

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
