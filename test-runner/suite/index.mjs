import { run as runRunner } from '../lib/runner.mjs';

export async function run() {
    await runRunner('**/*.test.{js,mjs}', import.meta.dirname);
}
