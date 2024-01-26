async function run() {
    const { run: runRunner } = await import('../lib/runner.mjs');
    await runRunner('**/**.test.?(m)js', __dirname);
}

module.exports = {
    run,
};
