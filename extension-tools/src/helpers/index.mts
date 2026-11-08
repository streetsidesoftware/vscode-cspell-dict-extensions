/**
 * What the tools share: where things are in the repository, reading and writing its files, formatting, and locales.
 */

export { format, injectProblems } from './format.mts';
export {
    canonicalLocale,
    englishLanguageName,
    languageOf,
    mostSpecificLocale,
    nativeLanguageName,
} from './locales.mts';
export { readPackageJson, readVscodeEngine, writePackageJson } from './packageJson.mts';
export type { PackageJson } from './packageJson.mts';
export { exists, extensionRepoPath, extensionsDir, readJson, repoRoot, writeIfChanged } from './repo.mts';
