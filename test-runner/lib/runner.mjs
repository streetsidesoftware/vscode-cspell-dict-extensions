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

    const files = await glob(testGlob, { cwd, absolute: true });

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
