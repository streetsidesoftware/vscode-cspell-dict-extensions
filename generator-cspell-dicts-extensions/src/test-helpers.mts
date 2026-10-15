import type { Prompter } from './prompt.mts';

export interface AskedQuestion {
    message: string;
    defaultValue: string | boolean | undefined;
}

/**
 * A `Prompter` that gives the answers in order and records the questions.
 * An empty or missing answer selects the default, like pressing Enter.
 */
export function scriptedPrompter(answers: readonly (string | boolean)[]): Prompter & { asked: AskedQuestion[] } {
    const remaining = [...answers];
    const asked: AskedQuestion[] = [];

    function next(message: string, defaultValue: string | boolean | undefined) {
        asked.push({ message, defaultValue });
        const answer = remaining.shift();
        return answer === undefined || answer === '' ? defaultValue : answer;
    }

    return {
        asked,
        input: (message, defaultValue) => Promise.resolve(String(next(message, defaultValue) ?? '')),
        confirm: (message, defaultValue) => Promise.resolve(next(message, defaultValue) === true),
    };
}
