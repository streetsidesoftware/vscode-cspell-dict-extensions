const { format, styleText } = require('util');

/**
 * Color text even when stdout is not a terminal. VSCode shows the extension host output with colors.
 * @param {Parameters<typeof styleText>[0]} style
 * @param {string} text
 */
function color(style, text) {
    return styleText(style, text, { validateStream: false });
}

function log(...params) {
    const dt = new Date();
    console.log('%s', `${color('cyan', dt.toISOString())} ${format(...params)}`);
}

module.exports = {
    color,
    log,
};
