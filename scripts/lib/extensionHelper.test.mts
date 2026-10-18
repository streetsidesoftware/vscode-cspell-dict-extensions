import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { IPackageOptions } from '@vscode/vsce';

import type { VsceOptions } from './extensionHelper.mts';

describe('VsceOptions', () => {
    it('matches the options of @vscode/vsce', () => {
        // Checked by `tsc`: an option `VsceOptions` names must have the type `IPackageOptions` gives it.
        const options: VsceOptions = { baseContentUrl: '', baseImagesUrl: '', preRelease: true };
        options satisfies IPackageOptions;
        const iPackageOptions: IPackageOptions = options;
        assert.ok(iPackageOptions === options);
    });
});
