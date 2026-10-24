### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `{@ locale @}` to the `cSpell.language` setting, will enable the {@ friendlyName @} dictionary. Example using
both English and {@ friendlyName @} dictionaries:

```javascript
"cSpell.language": "en,{@ locale @}",
```
