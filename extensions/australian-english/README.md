# Australian English - Code Spell Checker

Australian English dictionary extension for VS Code.

Imports the Australian English spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                                          | What   | Value | Scope     |
| ---------------------------------------------------------------- | ------ | ----- | --------- |
| Enable Australian English Spell Checker Dictionary               | locale | en-au | global    |
| Disable Australian English Spell Checker Dictionary              | locale | en-au | global    |
| Enable Australian English Spell Checker Dictionary in Workspace  | locale | en-au | workspace |
| Disable Australian English Spell Checker Dictionary in Workspace | locale | en-au | workspace |

<!--- @@inject-end: ./static/commands.json --->

<!--- @@inject: ../../static/manual-settings.english.md#values-file=:./extension.config.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Replacing `en` with `en-AU` in the `cSpell.language` setting will check Australian English spelling instead of American English:

```javascript
"cSpell.language": "en-AU",
```

To accept both the American and the Australian English spellings:

```javascript
"cSpell.language": "en,en-AU",
```

<!--- @@inject-end: ../../static/manual-settings.english.md#values-file=:./extension.config.json --->

## Dictionaries

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary                  | locale  | languageId | glob |
| --------------------------- | ------- | ---------- | ---- |
| `en-au`                     | `en-AU` | `*`        |      |
| `en-common-misspellings`    | `en-AU` | `*`        |      |
| `en-gb-common-misspellings` | `en-AU` | `*`        |      |

<!--- @@inject-end: ./static/dictionaries.json#markdown --->

<!--- @@inject: ../../static/dictionaries-columns.md --->

Each row is a setting that turns a dictionary on. The dictionary is on when all of the row's conditions match:

- **locale:** `cSpell.language` includes one of these locales.
- **languageId:** the file is one of these types.
- **glob:** the file's path matches one of these patterns.

An empty cell, or `*`, is no condition.

<!--- @@inject-end: ../../static/dictionaries-columns.md --->

<!--- @@inject: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->

## Requirements

This extension will automatically include the [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

| Tool                                                                                                            | Version   |
| --------------------------------------------------------------------------------------------------------------- | --------- |
| [cspell](https://github.com/streetsidesoftware/cspell)                                                          | `>=10`    |
| [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) | `>=4.7.0` |

<!--- @@inject-end: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->

<!--- @@inject: ../../static/footer.md --->

<br/>

---

<p align="center">
Copyright © 2017-2026 Street Side Software
</p>

<p align="center">
Brought to you by <a href="https://streetsidesoftware.com" title="Street Side Software">
<img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software
</a>
</p>

<!--- @@inject-end: ../../static/footer.md --->
