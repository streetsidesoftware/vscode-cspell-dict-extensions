async function run() {
    const { run: runRunner } = await import('../lib/runner.mjs');
    await runRunner('**/*.test.{js,mjs}', __dirname);
}

module.exports = {
    run,
};
