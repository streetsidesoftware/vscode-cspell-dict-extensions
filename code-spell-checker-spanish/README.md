# Code Spell Checker Spanish / Español Extension

Imports the Spanish spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands:
`F1` `Enable Spanish Spell Checker Dictionary`
or
`F1` `Enable Spanish Spell Checker Dictionary in Workspace`


### Disable Dictionary

Commands:
`F1` `Disable Spanish Spell Checker Dictionary`
or
`F1` `Disable Spanish Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

*Preferences* -> *Settings*

Adding `es` or `es-ES` to the `cSpell.language` setting, will enable the Spanish dictionary.
Example using both English and Spanish dictionaries:
```javascript
"cSpell.language": "en,es",
```

## Requirements
This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
