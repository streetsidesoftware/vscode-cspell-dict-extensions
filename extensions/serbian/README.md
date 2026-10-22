# Serbian - Code Spell Checker

Serbian dictionary extension for VS Code.

Imports the Serbian (both Cyrillic and Latin) spellchecking dictionaries for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionaries

- `F1` `Show Spell Checker Configuration Info` (or click on the "Spell" icon in the status bar)
- Enable the language globally in the `User` tab or in just in the `Workspace` tab.

![Selected dictionaries in the Spell Checker User Tab](https://i.imgur.com/78LApWC.png)

### Disable Dictionaries

- `F1` `Show Spell Checker Configuration Info` (or click on the "Spell" icon in the status bar)
- Disable the language globally in the `User` tab or in just in the `Workspace` tab.

### Enable/disable dictionaries via commands

You can also use the following commands (`F1` or _View -> Command Palette..._) to enable or disable Serbian dictionaries:

<!--- @@inject-table: ./static/commands.json --->

| Command                                               | What   | Value              | Scope     |
| ----------------------------------------------------- | ------ | ------------------ | --------- |
| Enable Serbian Spell Checker Dictionary               | locale | sr                 | global    |
| Disable Serbian Spell Checker Dictionary              | locale | sr,sr-Cyrl,sr-Latn | global    |
| Enable Serbian Cyrillic Spell Checker Dictionary      | locale | sr-Cyrl            | global    |
| Disable Serbian Cyrillic Spell Checker Dictionary     | locale | sr-Cyrl            | global    |
| Enable Serbian Latin Spell Checker Dictionary         | locale | sr-Latn            | global    |
| Disable Serbian Latin Spell Checker Dictionary        | locale | sr-Latn            | global    |
| Enable Serbian Spell Checker Dictionary in Workspace  | locale | sr                 | workspace |
| Disable Serbian Spell Checker Dictionary in Workspace | locale | sr,sr-Cyrl,sr-Latn | workspace |

<!--- @@inject-end: ./static/commands.json --->

![Commands dropdown for enabling and disabling Serbian dictionaries](https://i.imgur.com/3DPWwFV.png)

<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `sr` to the `cSpell.language` setting, will enable the Serbian dictionary.
Example using both English and Serbian dictionaries:

```javascript
"cSpell.language": "en,sr",
```

<!--- @@inject-end: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

## Dictionaries

Each row is a setting that turns a dictionary on. The dictionary is on when all of the row's conditions match:

- **locale:** `cSpell.language` includes one of these locales.
- **languageId:** the file is one of these types.
- **glob:** the file's path matches one of these patterns.

An empty cell is no condition.

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary | locale       | languageId | glob |
| ---------- | ------------ | ---------- | ---- |
| `sr-cyrl`  | `sr,sr-Cyrl` | `*`        |      |
| `sr-latn`  | `sr,sr-Latn` | `*`        |      |

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
