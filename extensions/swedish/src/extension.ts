// Written by `npm run sync:extensions`. Do not edit: put custom code in `src/custom.ts`.
import type { ExtensionContext } from 'vscode';

import { activateExtension } from '../../../extension-runtime/src/activate.ts';
import config from '../extension.config.json' with { type: 'json' };

/** Called by VS Code when the extension is loaded. It must return right away: see `activateExtension`. */
export function activate(context: ExtensionContext): void {
    activateExtension(context, config);
}

export function deactivate(): void {}
