# Swedish - Code Spell Checker

Swedish dictionary extension for VS Code.

Imports the Swedish spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable or Disable the Dictionary

Commands (use `F1` or _View -> Command Palette..._):

<!--- @@inject: ./static/commands.md --->

- `Enable Swedish Spell Checker Dictionary`
- `Disable Swedish Spell Checker Dictionary`
- `Enable Swedish Spell Checker Dictionary in Workspace`
- `Disable Swedish Spell Checker Dictionary in Workspace`

<!--- @@inject-end: ./static/commands.md --->

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `sv` to the `cSpell.language` setting, will enable the Swedish dictionary.
Example using both English and Swedish dictionaries:

```javascript
"cSpell.language": "en,sv",
```

<!--- @@inject: ./static/requirements.md --->

## Requirements

This extension will automatically include the [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

| Tool                                                                                                            | Version   |
| --------------------------------------------------------------------------------------------------------------- | --------- |
| [cspell](https://github.com/streetsidesoftware/cspell)                                                          | `>=10`    |
| [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) | `>=4.7.0` |

<!--- @@inject-end: ./static/requirements.md --->

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
