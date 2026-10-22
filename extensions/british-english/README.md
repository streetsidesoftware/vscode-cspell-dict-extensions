# British English - Code Spell Checker

British English dictionary extension for VS Code. This dictionary includes both the `-ise` and `-ize` spelling variants according
to the Oxford English Dictionary.

Note: this is a replacement dictionary for the one that is bundled with [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker). Due to licensing restrictions, the bundled dictionary is many years old.

## Installation

Once this extension is installed, the updated British English dictionary will automatically be used, if the `en-gb` locale is used.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                                       |
| ------------------------------------------------------------- |
| Enable British English Spell Checker Dictionary               |
| Disable British English Spell Checker Dictionary              |
| Enable British English Spell Checker Dictionary in Workspace  |
| Disable British English Spell Checker Dictionary in Workspace |

<!--- @@inject-end: ./static/commands.json --->

<!--- @@inject: ../../static/manual-settings.english.md#values-file=:./extension.config.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Replacing `en` with `en-GB` in the `cSpell.language` setting will check British English spelling instead of American English:

```javascript
"cSpell.language": "en-GB",
```

To accept both the American and the British English spellings:

```javascript
"cSpell.language": "en,en-GB",
```

<!--- @@inject-end: ../../static/manual-settings.english.md#values-file=:./extension.config.json --->

## Dictionaries

The dictionaries this extension adds, and where each one is on. `locale` is checked against `cSpell.language`. `languageId` is checked against the file type. `glob` is checked against the file's path. An empty cell matches everything.

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary | locale  | languageId | glob |
| ---------- | ------- | ---------- | ---- |
| `en-gb`    | `en-GB` | `*`        |      |

<!--- @@inject-end: ./static/dictionaries.json#markdown --->

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
