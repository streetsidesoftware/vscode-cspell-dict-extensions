import type { Prompter, Validate } from './prompt.mts';

export interface AskedQuestion {
    message: string;
    defaultValue: string | boolean | undefined;
    /** The validation error, when the answer was rejected. */
    error?: string;
}

/**
 * A `Prompter` that gives the answers in order and records the questions.
 * An empty or missing answer selects the default, like pressing Enter.
 * A rejected answer asks the question again, like inquirer.
 */
export function scriptedPrompter(answers: readonly (string | boolean)[]): Prompter & { asked: AskedQuestion[] } {
    const remaining = [...answers];
    const asked: AskedQuestion[] = [];

    function next(
        message: string,
        defaultValue: string | boolean | undefined,
    ): AskedQuestion & { answer: string | boolean | undefined } {
        const question: AskedQuestion = { message, defaultValue };
        asked.push(question);
        if (asked.length > 100) throw new Error('Too many questions.');
        const answer = remaining.shift();
        return Object.assign(question, { answer: answer === undefined || answer === '' ? defaultValue : answer });
    }

    async function input(message: string, defaultValue?: string, validate?: Validate): Promise<string> {
        for (;;) {
            const question = next(message, defaultValue);
            const answer = String(question.answer ?? '');
            const result = validate?.(answer) ?? true;
            if (result === true) return answer;
            question.error = result;
        }
    }

    return {
        asked,
        input,
        confirm: (message, defaultValue) => Promise.resolve(next(message, defaultValue).answer === true),
    };
}
