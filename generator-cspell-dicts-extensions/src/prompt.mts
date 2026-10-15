import { confirm, input } from '@inquirer/prompts';

/**
 * Asks the questions. The interface lets the tests answer without a terminal.
 */
export interface Prompter {
    /** Ask for text. An empty answer selects the default. */
    input(message: string, defaultValue?: string): Promise<string>;
    /** Ask a yes / no question. An empty answer selects the default. */
    confirm(message: string, defaultValue: boolean): Promise<boolean>;
}

export const inquirerPrompter: Prompter = {
    input: (message, defaultValue) => input({ message, default: defaultValue }),
    confirm: (message, defaultValue) => confirm({ message, default: defaultValue }),
};

/**
 * Inquirer rejects with an `ExitPromptError` when the user presses Ctrl+C.
 */
export function isExitPromptError(err: unknown): boolean {
    return err instanceof Error && err.name === 'ExitPromptError';
}
