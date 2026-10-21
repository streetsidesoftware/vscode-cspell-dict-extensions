// cspell:ignore elisp

/**
 * What turns a word list's dictionary on, and how to say it. Free of dependencies, so the generator's tests can use it.
 */

/** A dictionary in `cspell.import`, and what turns it on. */
export interface DictionaryState {
    name: string;
    /** On for every file: in `dictionaries`, or in a language setting for every file type. */
    all: boolean;
    /** The file types (VS Code language IDs) that turn it on, such as `clojure`. `*` is every file type. */
    fileTypes: string[];
    /** The locales that turn it on, for a natural language. */
    locales: string[];
    /** Nothing turns it on: users turn it on in their settings, or with the extension's commands. */
    off: boolean;
}

/** When a word list's dictionary is on, for the README: `all`, `off until turned on`, or its file types. */
export function describeFileTypes(state: DictionaryState): string {
    if (state.off) return 'off until turned on';
    if (state.all) return 'all';
    return state.fileTypes.map(code).join(', ');
}

/**
 * When a word list's dictionary is on, for a sentence: "on for every file", "off until you turn it on", or "on for
 * `elisp` and `lisp` files".
 */
export function whenOn(state: DictionaryState): string {
    if (state.off) return 'off until you turn it on';
    if (state.all) return 'on for every file';
    return `on for ${andList(state.fileTypes.map(code))} files`;
}

/** `a`, `a and b`, or `a, b and c`. */
export function andList(items: readonly string[]): string {
    return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? '');
}

function code(text: string): string {
    return `\`${text}\``;
}
