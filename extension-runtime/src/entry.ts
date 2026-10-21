/**
 * The entry point of every synced extension.
 *
 * The shared tsdown config (`extension-runtime/tsdown.extension.config.mts`) resolves `extension-config` to the extension's
 * `extension.config.json`, and `extension-custom` to its `src/custom.ts`, or to `noCustom.ts` when it has none.
 */
import type { ExtensionContext } from 'vscode';

import config from 'extension-config';
import * as custom from 'extension-custom';

import { activateExtension } from './activate.ts';

export function activate(context: ExtensionContext): Promise<void> {
    return activateExtension(context, config, custom);
}

export function deactivate(): void {}
