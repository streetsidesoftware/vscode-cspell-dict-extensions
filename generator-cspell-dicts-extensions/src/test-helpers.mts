import type { ReadLine } from './prompt.mts';

/**
 * A `ReadLine` that answers with the given lines, in order, and records the prompts.
 */
export function scriptedReadLine(lines: readonly string[]): ReadLine & { prompts: string[] } {
    const remaining = [...lines];
    const prompts: string[] = [];
    const readLine = (prompt: string) => {
        prompts.push(prompt);
        return Promise.resolve(remaining.shift());
    };
    return Object.assign(readLine, { prompts });
}
