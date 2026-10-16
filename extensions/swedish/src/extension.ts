// Written by `npm run sync:extensions`. Do not edit: put custom code in `src/custom.ts`.
import type { ExtensionContext } from 'vscode';

import { activateExtension } from '../../../extension-runtime/src/activate.ts';
import config from '../extension.config.json' with { type: 'json' };

export function activate(context: ExtensionContext): Promise<void> {
    return activateExtension(context, config);
}

export function deactivate(): void {}
