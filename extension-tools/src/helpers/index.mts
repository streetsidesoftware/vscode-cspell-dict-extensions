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
export {
    exists,
    extensionRepoPath,
    extensionsDir,
    readJson,
    readVscodeEngine,
    repoRoot,
    writeIfChanged,
} from './repo.mts';
