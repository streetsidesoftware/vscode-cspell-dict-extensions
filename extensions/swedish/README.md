# Swedish - Code Spell Checker

Swedish dictionary extension for VS Code.

Imports the Swedish spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).



## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Enable Swedish Spell Checker Dictionary`
- `Enable Swedish Spell Checker Dictionary in Workspace`


### Disable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Disable Swedish Spell Checker Dictionary`
- `Disable Swedish Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

*Preferences* -> *Settings*

Adding `sv` to the `cSpell.language` setting, will enable the Swedish dictionary.
Example using both English and Swedish dictionaries:
```javascript
"cSpell.language": "en,sv",
```



## Requirements
This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
