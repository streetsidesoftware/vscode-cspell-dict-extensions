import { createInterface } from 'node:readline/promises';
import { styleText } from 'node:util';

/**
 * Reads one line of input after showing the prompt.
 * Resolves to `undefined` when there is no more input.
 */
export type ReadLine = (prompt: string) => Promise<string | undefined>;

export interface Prompter {
    /** Ask for text. An empty answer selects the default. */
    input(message: string, defaultValue?: string): Promise<string>;
    /** Ask a yes / no question. An empty answer selects the default. */
    confirm(message: string, defaultValue: boolean): Promise<boolean>;
}

export function createPrompter(readLine: ReadLine): Prompter {
    async function ask(message: string, hint: string | undefined): Promise<string> {
        const prompt = `${styleText('green', '?')} ${styleText('bold', message)} ${hint ? styleText('dim', `(${hint}) `) : ''}`;
        const answer = await readLine(prompt);
        if (answer === undefined) throw new Error('No more input.');
        return answer.trim();
    }

    return {
        async input(message, defaultValue) {
            return (await ask(message, defaultValue)) || (defaultValue ?? '');
        },

        async confirm(message, defaultValue) {
            const answer = await ask(message, defaultValue ? 'Y/n' : 'y/N');
            if (/^y(es)?$/i.test(answer)) return true;
            if (/^no?$/i.test(answer)) return false;
            return defaultValue;
        },
    };
}

/**
 * Read lines from the terminal or from piped input.
 */
export function createTerminalReadLine(
    input: NodeJS.ReadableStream = process.stdin,
    output: NodeJS.WritableStream = process.stdout,
): { readLine: ReadLine; close: () => void } {
    const rl = createInterface({ input, output });
    rl.on('SIGINT', () => {
        rl.close();
        output.write('\n');
        process.exit(130);
    });
    // The iterator buffers lines, so piped answers are not lost while no question is pending.
    const lines = rl[Symbol.asyncIterator]();
    // The interface closes when the input ends, but buffered lines can still be read.
    let closed = false;
    rl.on('close', () => (closed = true));

    async function readLine(prompt: string): Promise<string | undefined> {
        if (closed) {
            output.write(prompt);
        } else {
            rl.setPrompt(prompt);
            rl.prompt();
        }
        const next = await lines.next();
        return next.done ? undefined : next.value;
    }

    function close(): void {
        if (!closed) rl.close();
    }

    return { readLine, close };
}
