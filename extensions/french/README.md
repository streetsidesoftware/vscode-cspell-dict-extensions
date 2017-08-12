# French - Code Spell Checker

French dictionary extension for VS Code.

Imports the French spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).



## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Enable French Spell Checker Dictionary`
- `Enable French Spell Checker Dictionary in Workspace`


### Disable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Disable French Spell Checker Dictionary`
- `Disable French Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

*Preferences* -> *Settings*

Adding `fr` to the `cSpell.language` setting, will enable the Spanish dictionary.
Example using both English and French dictionaries:
```javascript
"cSpell.language": "en,fr",
```

## Requirements
This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
