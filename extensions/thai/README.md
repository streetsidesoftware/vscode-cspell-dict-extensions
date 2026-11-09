# Thai - Code Spell Checker

Adds the Thai dictionary to
[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                            | What   | Value    | Scope     |
| -------------------------------------------------- | ------ | -------- | --------- |
| Enable Thai Spell Checker Dictionary               | locale | th-TH    | global    |
| Disable Thai Spell Checker Dictionary              | locale | th,th-TH | global    |
| Enable Thai Spell Checker Dictionary in Workspace  | locale | th-TH    | workspace |
| Disable Thai Spell Checker Dictionary in Workspace | locale | th,th-TH | workspace |

<!--- @@inject-end: ./static/commands.json --->

<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `th-TH` to the `cSpell.language` setting, will enable the Thai dictionary. Example using both English and Thai
dictionaries:

```javascript
"cSpell.language": "en,th-TH",
```

<!--- @@inject-end: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

## Dictionaries

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary | enabled     | locale        | languageId | glob |
| ---------- | ----------- | ------------- | ---------- | ---- |
| `th-th`    | conditional | `th`, `th-TH` |            |      |

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

| Tool                                                                                                            | Version    |
| --------------------------------------------------------------------------------------------------------------- | ---------- |
| [cspell](https://github.com/streetsidesoftware/cspell)                                                          | `>=10.3.5` |
| [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) | `>=4.9.6`  |

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
