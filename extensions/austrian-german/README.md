# Austrian German - Code Spell Checker

Austrian German dictionary extension for VS Code.

Imports the Austrian German spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                                       |
| ------------------------------------------------------------- |
| Enable Austrian German Spell Checker Dictionary               |
| Disable Austrian German Spell Checker Dictionary              |
| Enable Austrian German Spell Checker Dictionary in Workspace  |
| Disable Austrian German Spell Checker Dictionary in Workspace |

<!--- @@inject-end: ./static/commands.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `de-at` to the `cSpell.language` setting, will enable the Austrian_german dictionary.
Example using both English and Austrian German dictionaries:

```javascript
"cSpell.language": "en,de-at",
```

<!--- @@inject: ../../static/requirements.md --->

## Requirements

This extension will automatically include the [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

<!--- @@inject-end: ../../static/requirements.md --->

<!--- @@inject: ../../static/engines-table.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->

| Tool                                                                                                            | Version   |
| --------------------------------------------------------------------------------------------------------------- | --------- |
| [cspell](https://github.com/streetsidesoftware/cspell)                                                          | `>=10`    |
| [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) | `>=4.7.0` |

<!--- @@inject-end: ../../static/engines-table.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->

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
