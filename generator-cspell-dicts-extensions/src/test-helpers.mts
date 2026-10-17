import { type FetchJson, HttpError } from './npm.mts';
import type { Choice, Prompter, Validate } from './prompt.mts';

export interface AskedQuestion {
    message: string;
    defaultValue: unknown;
    /** The choices shown, for `select` and `search`. */
    choices?: string[];
    /** The validation error, when the answer was rejected. */
    error?: string;
}

/**
 * A `Prompter` that gives the answers in order and records the questions.
 * - An empty or missing answer selects the default, like pressing Enter.
 * - A rejected `input` answer asks the question again, like inquirer.
 * - A `select` answer is the value to pick.
 * - A `search` answer is the text to type; the first match is picked.
 */
export function scriptedPrompter(answers: readonly unknown[]): Prompter & { asked: AskedQuestion[] } {
    const remaining = [...answers];
    const asked: AskedQuestion[] = [];

    function next(message: string, defaultValue: unknown): AskedQuestion & { answer: unknown } {
        const question: AskedQuestion = { message, defaultValue };
        asked.push(question);
        if (asked.length > 100) throw new Error('Too many questions.');
        const answer = remaining.shift();
        return Object.assign(question, { answer: answer === undefined || answer === '' ? defaultValue : answer });
    }

    async function input(message: string, defaultValue?: string, validate?: Validate): Promise<string> {
        for (;;) {
            const question = next(message, defaultValue);
            const answer = typeof question.answer === 'string' ? question.answer : '';
            const result = validate?.(answer) ?? true;
            if (result === true) return answer;
            question.error = result;
        }
    }

    function select<T>(message: string, choices: Choice<T>[], defaultValue?: T): Promise<T> {
        const question = next(message, defaultValue);
        question.choices = choices.map((c) => c.name);
        const choice = choices.find((c) => c.value === question.answer);
        if (!choice) return Promise.reject(new Error(`No choice ${String(question.answer)} for: ${message}`));
        return Promise.resolve(choice.value);
    }

    function search<T>(message: string, source: (term: string) => Choice<T>[]): Promise<T> {
        const question = next(message, '');
        const term = typeof question.answer === 'string' ? question.answer : '';
        const choices = source(term);
        question.choices = choices.map((c) => c.name);
        const first = choices[0];
        if (!first) return Promise.reject(new Error(`Nothing matches "${term}" for: ${message}`));
        return Promise.resolve(first.value);
    }

    return {
        asked,
        input,
        confirm: (message, defaultValue) => Promise.resolve(next(message, defaultValue).answer === true),
        select,
        search,
    };
}

/**
 * A `fetchJson` that answers from a map of URL to response. A missing URL is a network error, and a number is an
 * HTTP error status.
 */
export function fakeFetch(responses: Record<string, unknown>): FetchJson {
    return (url) => {
        if (!(url in responses)) return Promise.reject(new Error(`offline: ${url}`));
        const response = responses[url];
        if (typeof response === 'number') return Promise.reject(new HttpError(url, response));
        return Promise.resolve(response);
    };
}
