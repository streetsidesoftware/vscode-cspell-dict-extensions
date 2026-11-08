# Norwegian Bokmål - Code Spell Checker

Norwegian Bokmål dictionary extension for VS Code.

Imports the Norwegian Bokmål spell checking dictionary for
[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                                        | What   | Value    | Scope     |
| -------------------------------------------------------------- | ------ | -------- | --------- |
| Enable Norwegian Bokmål Spell Checker Dictionary               | locale | nb-NO    | global    |
| Disable Norwegian Bokmål Spell Checker Dictionary              | locale | nb,nb-NO | global    |
| Enable Norwegian Bokmål Spell Checker Dictionary in Workspace  | locale | nb-NO    | workspace |
| Disable Norwegian Bokmål Spell Checker Dictionary in Workspace | locale | nb,nb-NO | workspace |

<!--- @@inject-end: ./static/commands.json --->

<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `nb-NO` to the `cSpell.language` setting, will enable the Norwegian Bokmål dictionary. Example using both English
and Norwegian Bokmål dictionaries:

```javascript
"cSpell.language": "en,nb-NO",
```

<!--- @@inject-end: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

## Dictionaries

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary  | enabled     | locale        | languageId | glob |
| ----------- | ----------- | ------------- | ---------- | ---- |
| `nb-no`     | conditional | `nb`, `nb-no` |            |      |
| `nb-no-alt` | no          |               |            |      |

<!--- @@inject-end: ./static/dictionaries.json#markdown --->

<!--- @@inject: ../../static/dictionaries-columns.md --->

The **enabled** column says when a dictionary is used:

- **yes:** for every file.
- **conditional:** when all of the row's conditions match. An empty cell is no condition.
- **no:** only after you enable it, with its Enable command or in `cSpell.dictionaries`.

The conditions:

- **locale:** `cSpell.language` includes one of these locales.
- **languageId:** the file is one of these types.
- **glob:** the file's path matches one of these patterns.

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
