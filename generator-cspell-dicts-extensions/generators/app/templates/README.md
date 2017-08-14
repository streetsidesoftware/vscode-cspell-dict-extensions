# <%= displayName %>

<%= description %>

Imports the <%= friendlyName %> spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

<% if (addCommands) { %>

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Enable <%= commandName %> Spell Checker Dictionary`
- `Enable <%= commandName %> Spell Checker Dictionary in Workspace`


### Disable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Disable <%= commandName %> Spell Checker Dictionary`
- `Disable <%= commandName %> Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

*Preferences* -> *Settings*

Adding `<%= local %>` to the `cSpell.language` setting, will enable the <%= commandName %> dictionary.
Example using both English and <%= friendlyName %> dictionaries:
```javascript
"cSpell.language": "en,<%= local %>",
```

<% } else { %>

<% } %>

## Requirements
This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
