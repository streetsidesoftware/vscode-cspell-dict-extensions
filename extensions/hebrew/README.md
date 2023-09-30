# Hebrew - Code Spell Checker

Hebrew dictionary extension for VS Code.

Imports the Hebrew spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## About the Hebrew Dictionary

The Hebrew Dictionary has been compiled from the Hunspell Hebrew Dictionary:

> By the Hspell project (http://hspell.ivrix.org.il/).
> Hspell version 1.4 was used.
> Copyright 2004-2017, Nadav Har'El and Dan Kenigsberg
> The dictionary (this file and the corresponding word list)
> is licensed under the GNU Affero General Public License

But, due to the complexity of the Hebrew language, a significant portion of the dictionary was not able to be
included in this extension.

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `F1` `Show Spell Checker Configuration Info`
- Select the `Language` tab.
- Enable the language Globally or in just the Workspace.

### Disable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `F1` `Show Spell Checker Configuration Info`
- Select the `Language` tab.
- Disable the language Globally or in just the Workspace.

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `he` to the `cSpell.language` setting, will enable the Hebrew dictionary.
Example using both English and Hebrew dictionaries:

```javascript
"cSpell.language": "en,he",
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

<!---
cspell:ignore hspell Nadav Har'El and Dan Kenigsberg
--->
