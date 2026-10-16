/**
 * The entry point of every synced extension.
 *
 * The shared tsdown config (`.config/tsdown.extension.config.mts`) resolves `extension-config` to the extension's
 * `extension.config.json`, and `extension-custom` to its `src/custom.ts`, or to `noCustom.ts` when it has none.
 */
import type { ExtensionContext } from 'vscode';

import config from 'extension-config';
import * as custom from 'extension-custom';

import { activateExtension } from './activate.ts';
import type { ExtensionConfig } from './config.ts';

export function activate(context: ExtensionContext): Promise<void> {
    // `npm run sync:extensions` has checked the config against its schema.
    return activateExtension(context, config as ExtensionConfig, custom);
}

export function deactivate(): void {}
