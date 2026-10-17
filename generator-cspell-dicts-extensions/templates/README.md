# <%= displayName %>

<%= description %>

<% if (isDictionary) { %>
Imports the <%= friendlyName %> spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).
<% } %>
<% if (isParser) { %>
Adds the <%= friendlyName %> parser to [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).
<% } %>
<% if (isScaffold) { %>
Extends [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).
<% } %>

<% if (toggleLocale) { %>
## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Enable <%= commandName %> Spell Checker Dictionary`
- `Enable <%= commandName %> Spell Checker Dictionary in Workspace`

Or:
- `F1` `Show Spell Checker Configuration Info`
- Select the `Language` tab.
- Enable the language Globally or in just the Workspace.

### Disable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Disable <%= commandName %> Spell Checker Dictionary`
- `Disable <%= commandName %> Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

*Preferences* -> *Settings*

Adding `<%= localeExample %>` to the `cSpell.language` setting, will enable the <%= commandName %> dictionary.
Example using both English and <%= friendlyName %> dictionaries:
```javascript
"cSpell.language": "en,<%= localeExample %>",
```

<% } %>
<% if (toggleDictionary) { %>
## Enable / Disable

Commands (use `F1` or *View -> Command Palette...*):
- `Enable <%= commandName %> Spell Checker Dictionary`
- `Disable <%= commandName %> Spell Checker Dictionary`
- `Enable <%= commandName %> Spell Checker Dictionary in Workspace`
- `Disable <%= commandName %> Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `dictionaries` setting. A `!` before a name turns the dictionary off.

```javascript
"cSpell.dictionaries": ["<%= dictionaryExample %>"],
```

<% } %>
<% if (toggleFileType) { %>
## Enable / Disable

Commands (use `F1` or *View -> Command Palette...*):
- `Enable <%= commandName %> Spell Checking of File Types`
- `Disable <%= commandName %> Spell Checking of File Types`

<% } %>
<% if (isParser) { %>
## Enable / Disable

The parser is on while this extension is enabled. To turn it off, use **Disable** or **Disable (Workspace)** on this extension in the Extensions view.

<% } %>
## Requirements
This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

<!--- @@inject: ../../static/footer.md --->
