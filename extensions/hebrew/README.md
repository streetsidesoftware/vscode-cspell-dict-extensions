# Hebrew - Code Spell Checker

Hebrew dictionary extension for VS Code.

Imports the Hebrew spell checking dictionary for
[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## About the Hebrew Dictionary

The Hebrew Dictionary has been compiled from the Hunspell Hebrew Dictionary:

> By the Hspell project (<http://hspell.ivrix.org.il/>). Hspell version 1.4 was used. Copyright 2004-2017, Nadav Har'El
> and Dan Kenigsberg The dictionary (this file and the corresponding word list) is licensed under the GNU Affero General
> Public License

But, due to the complexity of the Hebrew language, a significant portion of the dictionary was not able to be included
in this extension.

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                              | What   | Value | Scope     |
| ---------------------------------------------------- | ------ | ----- | --------- |
| Enable Hebrew Spell Checker Dictionary               | locale | he    | global    |
| Disable Hebrew Spell Checker Dictionary              | locale | he    | global    |
| Enable Hebrew Spell Checker Dictionary in Workspace  | locale | he    | workspace |
| Disable Hebrew Spell Checker Dictionary in Workspace | locale | he    | workspace |

<!--- @@inject-end: ./static/commands.json --->

<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `he` to the `cSpell.language` setting, will enable the Hebrew dictionary. Example using both English and Hebrew
dictionaries:

```javascript
"cSpell.language": "en,he",
```

<!--- @@inject-end: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

## Dictionaries

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary | locale | languageId | glob |
| ---------- | ------ | ---------- | ---- |
| `he`       | `he`   |            |      |

<!--- @@inject-end: ./static/dictionaries.json#markdown --->

<!--- @@inject: ../../static/dictionaries-columns.md --->

Each row is a setting that turns a dictionary on. The dictionary is on when all of the row's conditions match:

- **locale:** `cSpell.language` includes one of these locales.
- **languageId:** the file is one of these types.
- **glob:** the file's path matches one of these patterns.

An empty cell is no condition.

<!--- @@inject-end: ../../static/dictionaries-columns.md --->

<!--- @@inject: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->

## Requirements

This extension will automatically include the
[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
extension.

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

<!---
cspell:ignore hspell Nadav Har'El and Dan Kenigsberg
--->
