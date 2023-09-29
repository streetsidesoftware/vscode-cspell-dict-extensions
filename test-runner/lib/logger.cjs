const { format } = require('util');
const { esmImports } = require('./esmImport.cjs');

const { Chalk } = esmImports;

const chalk = new Chalk({ level: 1 });

function log(...params) {
    const dt = new Date();
    console.log('%s', `${chalk.cyan(dt.toISOString())} ${format(...params)}`);
}

module.exports = {
    chalk,
    log,
};
