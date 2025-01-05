// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const options: FormatTimestampOptions = {
        minDate: new Date('1980-01-01'),
    };

    const hoverProvider = vscode.languages.registerHoverProvider(
        { scheme: '*', language: '*' },
        {
            provideHover(document, position) {
                const range = document.getWordRangeAtPosition(position);
                if (!range) {
                    return undefined;
                }
                const word = document.getText(range);
                const hoverMessage = formatTimestamp(word, options);
                return hoverMessage ? new vscode.Hover(`_${hoverMessage}_`) : undefined;
            },
        },
    );
    context.subscriptions.push(hoverProvider);
}

const regexpIsNumber = /^\d+(?:\.\d*)?$/;

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

// this method is called when your extension is deactivated
export function deactivate() {}
