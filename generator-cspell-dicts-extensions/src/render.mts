/**
 * A minimal renderer for the EJS subset used by the templates:
 *
 * - `<%= name %>` inserts a value, HTML escaped like EJS.
 * - `<%- name %>` inserts a value as it is, i.e. code or JSON.
 * - `<% if (name) { %>`, `<% } else { %>` and `<% } %>` include text based upon a value.
 *
 * Text outside of the tags is kept as is, including whitespace and line breaks, except that a line holding only an
 * `if`, `else` or end tag is removed, so block tags leave no blank lines.
 * Any other tag is an error.
 */

export type TemplateData = Readonly<Record<string, string | boolean | undefined>>;

interface Block {
    condition: boolean;
    inElse: boolean;
    /** Whether the enclosing blocks are rendered. */
    parentActive: boolean;
}

const regExpTag = /<%([=-]?)([\s\S]*?)%>/g;
const regExpIdentifier = /^[a-z_$][\w$]*$/i;
const regExpIf = /^if\s*\(\s*([a-z_$][\w$]*)\s*\)\s*\{$/i;
const regExpElse = /^\}\s*else\s*\{$/;
const regExpEnd = /^\}$/;

/**
 * Render a template.
 * @param template - the template text.
 * @param data - the values available to the template.
 * @returns the rendered text.
 */
export function render(template: string, data: TemplateData): string {
    const stack: Block[] = [];
    let active = true;
    let result = '';
    let lastIndex = 0;

    for (const match of template.matchAll(regExpTag)) {
        const output = match[1];
        const code = match[2].trim();
        let start = match.index;
        let end = match.index + match[0].length;

        // A block tag alone on its line removes the whole line.
        if (!output) {
            const lineStart = template.lastIndexOf('\n', start - 1) + 1;
            const after = /^[ \t]*(\r?\n|$)/.exec(template.slice(end));
            if (lineStart >= lastIndex && after && /^[ \t]*$/.test(template.slice(lineStart, start))) {
                start = lineStart;
                end += after[0].length;
            }
        }

        if (active) result += template.slice(lastIndex, start);
        lastIndex = end;

        if (output) {
            if (!regExpIdentifier.test(code)) throw new Error(`Unsupported template expression: ${match[0]}`);
            const value = lookup(data, code);
            if (active) result += output === '=' ? escapeXml(value) : String(value ?? '');
            continue;
        }

        const ifMatch = regExpIf.exec(code);
        if (ifMatch) {
            const condition = !!lookup(data, ifMatch[1]);
            stack.push({ condition, inElse: false, parentActive: active });
            active = active && condition;
            continue;
        }

        const block = stack.at(-1);
        if (regExpElse.test(code)) {
            if (!block || block.inElse) throw new Error(`Unexpected else: ${match[0]}`);
            block.inElse = true;
            active = block.parentActive && !block.condition;
            continue;
        }

        if (regExpEnd.test(code)) {
            if (!block) throw new Error(`Unexpected end of block: ${match[0]}`);
            stack.pop();
            active = block.parentActive;
            continue;
        }

        throw new Error(`Unsupported template tag: ${match[0]}`);
    }

    if (stack.length) throw new Error('Unclosed if block in template.');

    return result + template.slice(lastIndex);
}

function lookup(data: TemplateData, name: string): string | boolean | undefined {
    if (!Object.hasOwn(data, name)) throw new Error(`Unknown template value: ${name}`);
    return data[name];
}

const xmlEscapes: Readonly<Record<string, string>> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&#34;',
    "'": '&#39;',
};

/**
 * Escape a value the same way EJS does for `<%= %>`.
 */
export function escapeXml(value: string | boolean | undefined): string {
    return String(value ?? '').replaceAll(/[&<>"']/g, (c) => xmlEscapes[c] ?? c);
}
