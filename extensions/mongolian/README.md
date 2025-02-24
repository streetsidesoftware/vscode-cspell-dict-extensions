# Mongolian - Code Spell Checker
### Монгол хэлний үг үсгийн алдаа шалгагч

[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)-ийн Монгол хэлний үг үсгийн алдаа шалгах толь бичгийг импортлоно.

VS Code-д зориулсан Монгол хэлний толь бичгийн өргөтгөл.

--------------

Mongolian dictionary extension for VS Code.

Imports the Mongolian spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).


## Суулгах | Installation

Энэ өргөтгөлийг суулгасны дараа үг үсгийн алдаа шалгагчид үүнийг ашиглахыг зааж өгөх шаардлагатай.

---------------

After this extension is installed, it is necessary to tell the spell checker to use it.

## Толь бичгийг идэвхжүүлэх | Enable Dictionary

Командууд (`F1` эсвэл View -> Command Palette...):
- `F1` `Show Spell Checker Configuration Info` | Үг үсгийн алдаа шалгагчийн тохиргооны мэдээллийг харуулах
- Language таб-ыг сонгоно. | `Language` (Хэл) таб-ыг сонгоно.
- Хэлийг бүхэлд нь эсвэл зөвхөн тухайн Workspace-д идэвхжүүлнэ. | Хэлийг бүх - систем дээр эсвэл зөвхөн тухайн ажлын орчинд идэвхжүүлнэ.

---------------

Commands (use `F1` or _View -> Command Palette..._):

- `F1` `Show Spell Checker Configuration Info`
- Select the `Language` tab.
- Enable the language Globally or in just the Workspace.

## Гар аргаар тохиргоо хийх | Manual Settings

Үүнийг language тохиргоогоор гүйцэтгэнэ.

Preferences (Тохиргоо) -> Settings (Тохируулга)

`cSpell.language` тохиргоонд mn-mn нэмж оруулсан-аар Монгол хэлний толь бичгийг идэвхжүүлнэ.
Англи болон Монгол хэлний толь бичгийг хамтад нь ашиглах жишээ:
```javascript
"cSpell.language": "en,mn-mn",
```

---------------

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `mn-mn` to the `cSpell.language` setting, will enable the Mongolian dictionary.
Example using both English and Mongolian dictionaries:

```javascript
"cSpell.language": "en,mn-mn",
```

## Шаардлага | Requirements

Энэ өргөтгөл нь [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) өргөтгөлийг автоматаар суулгах болно.

---------------

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

## Хувь нэмэр оруулагчид | Contributors

_Language_ - [Battseren Badral](https://github.com/btseee)

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
cspell:words Battseren Badral
--->
