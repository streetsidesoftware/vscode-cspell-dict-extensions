# Danish - Code Spell Checker

Danish dictionary extension for VS Code.

Imports the Danish spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                              |
| ---------------------------------------------------- |
| Enable Danish Spell Checker Dictionary               |
| Disable Danish Spell Checker Dictionary              |
| Enable Danish Spell Checker Dictionary in Workspace  |
| Disable Danish Spell Checker Dictionary in Workspace |

<!--- @@inject-end: ./static/commands.json --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `da` to the `cSpell.language` setting, will enable the Danish dictionary.
Example using both English and Danish dictionaries:

```javascript
"cSpell.language": "en,da",
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
