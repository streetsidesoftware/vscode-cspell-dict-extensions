# Code Spell Checker Spanish / Español Extension

Imports the Spanish spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                               |
| ----------------------------------------------------- |
| Enable Spanish Spell Checker Dictionary               |
| Disable Spanish Spell Checker Dictionary              |
| Enable Spanish Spell Checker Dictionary in Workspace  |
| Disable Spanish Spell Checker Dictionary in Workspace |

<!--- @@inject-end: ./static/commands.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `es` or `es-ES` to the `cSpell.language` setting, will enable the Spanish dictionary.
Example using both English and Spanish dictionaries:

```javascript
"cSpell.language": "en,es",
```

## Dictionaries

The dictionaries this extension adds, and the locales in `cSpell.language` that turn each one on:

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary | Locales       |
| ---------- | ------------- |
| `es-es`    | `es`, `es-ES` |

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

<!--- cspell:ignore Español --->
