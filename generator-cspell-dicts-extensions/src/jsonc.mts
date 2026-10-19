/**
 * Parse JSON that may have comments and trailing commas, like cspell configuration files.
 */
export function parseJsonc(text: string): unknown {
    return JSON.parse(removeTrailingCommas(removeComments(text)));
}

/** Call `visit` for each character outside of strings; strings are copied as they are. */
function scan(text: string, visit: (i: number) => { skip: number; keep: boolean }): string {
    let out = '';
    let i = 0;
    while (i < text.length) {
        if (text[i] === '"') {
            let j = i + 1;
            while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
            out += text.slice(i, j + 1);
            i = j + 1;
            continue;
        }
        const { skip, keep } = visit(i);
        if (keep) out += text.slice(i, i + skip);
        i += skip;
    }
    return out;
}

function removeComments(text: string): string {
    return scan(text, (i) => {
        if (text.startsWith('//', i)) {
            const end = text.indexOf('\n', i);
            return { skip: (end < 0 ? text.length : end) - i, keep: false };
        }
        if (text.startsWith('/*', i)) {
            const end = text.indexOf('*/', i + 2);
            return { skip: (end < 0 ? text.length : end + 2) - i, keep: false };
        }
        return { skip: 1, keep: true };
    });
}

function removeTrailingCommas(text: string): string {
    const closes = /\s*[}\]]/y;
    return scan(text, (i) => {
        if (text[i] !== ',') return { skip: 1, keep: true };
        closes.lastIndex = i + 1;
        return { skip: 1, keep: !closes.test(text) };
    });
}
