# Finnish - Code Spell Checker

Finnish dictionary extension for VS Code.

Imports the Finnish spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                               |
| ----------------------------------------------------- |
| Enable Finnish Spell Checker Dictionary               |
| Disable Finnish Spell Checker Dictionary              |
| Enable Finnish Spell Checker Dictionary in Workspace  |
| Disable Finnish Spell Checker Dictionary in Workspace |

<!--- @@inject-end: ./static/commands.json --->

<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `fi-FI` to the `cSpell.language` setting, will enable the Finnish dictionary.
Example using both English and Finnish dictionaries:

```javascript
"cSpell.language": "en,fi-FI",
```

<!--- @@inject-end: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->

## Dictionaries

The dictionaries this extension adds, and where each one is on. `locale` is checked against `cSpell.language`. `languageId` is checked against the file type. `glob` is checked against the file's path. An empty cell matches everything.

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary | locale     | languageId | glob |
| ---------- | ---------- | ---------- | ---- |
| `fi-fi`    | `fi,fi-fi` | `*`        |      |

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
