# Ancient Greek - Code Spell Checker

Ancient Greek dictionary extension for VS Code.

Imports the Ancient Greek spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                                     | What   | Value                | Scope     |
| ----------------------------------------------------------- | ------ | -------------------- | --------- |
| Enable Ancient Greek Spell Checker Dictionary               | locale | grc-GR               | global    |
| Disable Ancient Greek Spell Checker Dictionary              | locale | grc,grc-GR,gr,el-GRC | global    |
| Enable Ancient Greek Spell Checker Dictionary in Workspace  | locale | grc-GR               | workspace |
| Disable Ancient Greek Spell Checker Dictionary in Workspace | locale | grc,grc-GR,gr,el-GRC | workspace |

<!--- @@inject-end: ./static/commands.json --->

<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `grc-GR` to the `cSpell.language` setting, will enable the Ancient Greek dictionary.
Example using both English and Ancient Greek dictionaries:

```javascript
"cSpell.language": "en,grc-GR",
```

<!--- @@inject-end: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

## Dictionaries

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary | locale                          | languageId | glob |
| ---------- | ------------------------------- | ---------- | ---- |
| `grc`      | `grc`, `grc_GR`, `gr`, `el-GRC` |            |      |

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
