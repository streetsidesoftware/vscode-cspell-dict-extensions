import * as vscode from 'vscode';

const regexpIsNumber = /^\d+(?:\.\d*)?$/;
const regexpWord = /[_0-9.]+/;

/**
 * Called by VS Code when the extension is loaded.
 */
export function activate(context: vscode.ExtensionContext) {
    const options: FormatTimestampOptions = {
        minDate: new Date('1980-01-01'),
    };

    const hoverProvider = vscode.languages.registerHoverProvider(
        { scheme: '*', language: '*' },
        {
            provideHover(document, position) {
                const range = document.getWordRangeAtPosition(position, regexpWord);
                if (!range) {
                    return undefined;
                }
                const word = document.getText(range).replaceAll('_', '');
                const hoverMessage = formatTimestamp(word, options);
                return hoverMessage ? new vscode.Hover(`_${hoverMessage}_`) : undefined;
            },
        },
    );
    context.subscriptions.push(hoverProvider);
}

interface FormatTimestampOptions {
    minDate: Date;
}

function formatTimestamp(text: string, options: FormatTimestampOptions): string | undefined {
    if (!regexpIsNumber.test(text)) {
        return undefined;
    }
    let timestamp = Number(text);
    if (timestamp < 1e11) {
        // seconds to milliseconds
        timestamp *= 1000;
    }
    if (timestamp > 1e14) {
        // too large
        return undefined;
    }
    if (timestamp < options.minDate.getTime()) {
        return undefined;
    }
    try {
        return new Date(Math.round(timestamp)).toISOString();
    } catch {
        return undefined;
    }
}

/**
 * Called by VS Code when the extension is unloaded.
 */
export function deactivate() {}
