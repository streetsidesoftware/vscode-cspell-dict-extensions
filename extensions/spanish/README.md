# Code Spell Checker Spanish / Español Extension

Imports the Spanish spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `Enable Spanish Spell Checker Dictionary`
- `Enable Spanish Spell Checker Dictionary in Workspace`

### Disable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `Disable Spanish Spell Checker Dictionary`
- `Disable Spanish Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `es` or `es-ES` to the `cSpell.language` setting, will enable the Spanish dictionary.
Example using both English and Spanish dictionaries:

```javascript
"cSpell.language": "en,es",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

<!--- @@inject: ../../static/footer.md --->

<br/>

---

<p align="center">
Brought to you by <a href="https://streetsidesoftware.com" title="Street Side Software">
<img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software
</a>
</p>

<!--- @@inject-end: ../../static/footer.md --->
