import type {
    CSpellSettings,
    DictionaryDefinitionBase,
    LanguageSetting as CSpellLanguageSetting,
    OverrideSettings,
} from '@cspell/cspell-types';

import type { DictionaryDefinition, DictionaryExt, LanguageSetting, Override } from './dictionaries.mts';

/** The fields of `T` that `U` doesn't have. */
type Extra<T, U> = Exclude<keyof T, keyof U>;
/** Compiles only when `T` is `never`. */
type None<T extends never> = T;
/** The fields of `T` whose type doesn't fit the same field of `U`. */
type Misfit<T, U> = {
    [K in keyof T & keyof U]: NonNullable<T[K]> extends NonNullable<U[K]> ? never : K;
}[keyof T & keyof U];

// Checked by `tsc` (`npm run check-types`), not at run time: each shadow type names only fields cspell has, with types
// cspell accepts.
export type Checks = [
    None<Extra<DictionaryExt, CSpellSettings>>,
    None<Misfit<Omit<DictionaryExt, 'dictionaryDefinitions' | 'languageSettings' | 'overrides'>, CSpellSettings>>,
    None<Extra<DictionaryDefinition, DictionaryDefinitionBase>>,
    None<Misfit<DictionaryDefinition, DictionaryDefinitionBase>>,
    None<Extra<LanguageSetting, CSpellLanguageSetting>>,
    None<Misfit<LanguageSetting, CSpellLanguageSetting>>,
    None<Extra<Override, OverrideSettings>>,
    None<Misfit<Override, OverrideSettings>>,
];
