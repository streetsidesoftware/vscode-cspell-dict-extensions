/**
 * The Wording rule of `docs/style.md`: write "enable" and "disable", not "turn on" and "turn off", and "enabled" and
 * "disabled", not "on" and "off".
 */

export interface WordingProblem {
    /** Where the phrase starts in the text. */
    index: number;
    phrase: string;
    fix: string;
}

/** A phrase found in a file the check reads, allowed until the issue named in `reason` is done. */
export interface KnownException {
    file: string;
    phrase: string;
    reason: string;
}

export const knownExceptions: readonly KnownException[] = [
    ...['french', 'french-reforme', 'german', 'portuguese', 'portuguese-brazilian', 'swiss-german'].map((name) => ({
        file: `extensions/${name}/extension.config.json`,
        phrase: 'keeps this dictionary on',
        reason: 'issue #1810',
    })),
    { file: 'extensions/french-reforme/extension.config.json', phrase: 'turn on', reason: 'issue #1810' },
    { file: 'extensions/french/extension.config.json', phrase: 'turns it on', reason: 'issue #1810' },
    { file: 'extensions/serbian/extension.config.json', phrase: 'turns on', reason: 'issue #1810' },
];

/**
 * Files the check skips:
 * - license texts, which use "on" in their own sense
 * - changelogs, which are history
 * - files built from files the check reads: lock files, `static/generated/` and each extension's `extension.js`
 * - the samples, which hold Wikipedia text
 */
const skipped: readonly RegExp[] = [
    /(^|\/)(LICENSE|COPYING)[^/]*$/,
    /(^|\/)CHANGELOG\.md$/,
    /(^|\/)package-lock\.json$/,
    /^static\/generated\//,
    /^extensions\/[^/]+\/extension\.js$/,
    /^extensions\/[^/]+\/samples\//,
];

/** @param file - a repo path. */
export function isChecked(file: string): boolean {
    return !skipped.some((pattern) => pattern.test(file));
}

/** A word inside a clause: no spaces or clause punctuation. */
const word = String.raw`[^\s.,;:!?"'\`()]+`;
/** What may follow "on" or "off" when they name a state: the clause ends, or a word that starts its condition. */
const stateEnd = String.raw`(?=\s*(?:[.,;:!?)"'\`*]|$)|\s+(?:when|while|until|only|for|by default)\b)`;

interface Rule {
    pattern: RegExp;
    fix: (match: RegExpExecArray) => string;
}

const rules: readonly Rule[] = [
    {
        // "turn on", "turns it off", "turning the mode on"
        pattern: new RegExp(String.raw`\bturn(?:s|ed|ing)?(?:\s+${word}){0,2}?\s+(on|off)\b`, 'gi'),
        fix: (match) => (onOrOff(match) === 'on' ? 'enable' : 'disable'),
    },
    {
        // "is on when", "stays off until"
        pattern: new RegExp(
            String.raw`\b(?:is|are|was|were|be|been|stay|stays|stayed|always)\s+(on|off)${stateEnd}`,
            'gi',
        ),
        fix: (match) => (onOrOff(match) === 'on' ? 'enabled' : 'disabled'),
    },
    {
        // "keeps this dictionary on."
        pattern: new RegExp(
            String.raw`\b(?:keep|keeps|kept|leave|leaves|left)(?:\s+${word}){0,2}?\s+(on|off)${stateEnd}`,
            'gi',
        ),
        fix: (match) => (onOrOff(match) === 'on' ? 'enabled' : 'disabled'),
    },
    {
        // "on or off", "on and off", "on/off"
        pattern: /\bon\s*(or|and|\/)\s*off\b/gi,
        fix: (match) => (match[1] === '/' ? 'enable or disable' : `enable ${match[1].toLowerCase()} disable`),
    },
    {
        // "off until", "on by default"
        pattern: /\b(on|off)\s+(?:by default|until)\b/gi,
        fix: (match) => (onOrOff(match) === 'on' ? 'enabled' : 'disabled'),
    },
];

/**
 * The phrases in `text` that break the rule. A phrase in double quotes by itself, such as `"turn on"`, mentions the
 * phrase rather than using it, and is allowed.
 */
export function findWordingProblems(text: string): WordingProblem[] {
    const problems: WordingProblem[] = [];
    for (const rule of rules) {
        for (const match of text.matchAll(rule.pattern)) {
            const end = match.index + match[0].length;
            if (text[match.index - 1] === '"' && text[end] === '"') continue;
            problems.push({ index: match.index, phrase: match[0], fix: rule.fix(match) });
        }
    }
    return problems.sort((a, b) => a.index - b.index);
}

function onOrOff(match: RegExpExecArray): string {
    return match[1].toLowerCase();
}
