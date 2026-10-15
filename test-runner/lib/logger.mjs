import { format, styleText } from 'node:util';

/**
 * Color text even when stdout is not a terminal. VSCode shows the extension host output with colors.
 * @param {Parameters<typeof styleText>[0]} style
 * @param {string} text
 */
export function color(style, text) {
    return styleText(style, text, { validateStream: false });
}

export function log(...params) {
    const dt = new Date();
    console.log('%s', `${color('cyan', dt.toISOString())} ${format(...params)}`);
}
