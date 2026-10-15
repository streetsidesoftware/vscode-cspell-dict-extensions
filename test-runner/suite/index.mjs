import { run as runRunner } from '../lib/runner.mts';

export async function run() {
    await runRunner('**/*.test.mts', import.meta.dirname);
}
