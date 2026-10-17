import { confirm, input, search, select } from '@inquirer/prompts';

export type Validate = (answer: string) => true | string;

export interface Choice<T> {
    name: string;
    value: T;
    description?: string;
}

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
    /** Pick one of the choices. */
    select<T>(message: string, choices: Choice<T>[], defaultValue?: T): Promise<T>;
    /**
     * Pick one of the choices that match what was typed.
     * @param source - returns the choices for the typed text.
     */
    search<T>(message: string, source: (term: string) => Choice<T>[]): Promise<T>;
}

export const inquirerPrompter: Prompter = {
    input: (message, defaultValue, validate) => input({ message, default: defaultValue, validate }),
    confirm: (message, defaultValue) => confirm({ message, default: defaultValue }),
    select: (message, choices, defaultValue) => select({ message, choices, default: defaultValue }),
    search: (message, source) => search({ message, source: (term) => source(term ?? ''), pageSize: 12 }),
};

/**
 * Used with `--yes`: asking a question is a bug, because every value must come from an option or a default.
 */
export const noPrompter: Prompter = {
    input: (message) => Promise.reject(new Error(`Unexpected question with --yes: ${message}`)),
    confirm: (message) => Promise.reject(new Error(`Unexpected question with --yes: ${message}`)),
    select: (message) => Promise.reject(new Error(`Unexpected question with --yes: ${message}`)),
    search: (message) => Promise.reject(new Error(`Unexpected question with --yes: ${message}`)),
};

/**
 * Inquirer rejects with an `ExitPromptError` when the user presses Ctrl+C.
 */
export function isExitPromptError(err: unknown): boolean {
    return err instanceof Error && err.name === 'ExitPromptError';
}
