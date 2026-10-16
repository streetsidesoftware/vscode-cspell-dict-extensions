import { confirm, input } from '@inquirer/prompts';

export type Validate = (answer: string) => true | string;

/**
 * Asks the questions. The interface lets the tests answer without a terminal.
 */
export interface Prompter {
    /**
     * Ask for text. An empty answer selects the default.
     * @param validate - returns true when the answer is valid, or an error message, and the question is asked again.
     */
    input(message: string, defaultValue?: string, validate?: Validate): Promise<string>;
    /** Ask a yes / no question. An empty answer selects the default. */
    confirm(message: string, defaultValue: boolean): Promise<boolean>;
}

export const inquirerPrompter: Prompter = {
    input: (message, defaultValue, validate) => input({ message, default: defaultValue, validate }),
    confirm: (message, defaultValue) => confirm({ message, default: defaultValue }),
};

/**
 * Inquirer rejects with an `ExitPromptError` when the user presses Ctrl+C.
 */
export function isExitPromptError(err: unknown): boolean {
    return err instanceof Error && err.name === 'ExitPromptError';
}
