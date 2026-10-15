import { format, styleText } from 'node:util';

/**
 * Color text even when stdout is not a terminal. VSCode shows the extension host output with colors.
 */
export function color(style: Parameters<typeof styleText>[0], text: string): string {
    return styleText(style, text, { validateStream: false });
}

export function log(...params: unknown[]): void {
    const dt = new Date();
    console.log('%s', `${color('cyan', dt.toISOString())} ${format(...params)}`);
}
