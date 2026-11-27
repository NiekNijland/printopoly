# De ontwerpprototypes staan buiten de linter

Status: aanvaard.

## Context

`docs/design` bevat de prototypes en schermafbeeldingen van de ontwerprondes. `support.js` daarin is een runtime voor de prototypes en gebruikt `new Function`; het is geen code van de applicatie en wordt nergens geïmporteerd. Lint schoon maken zou de runtime veranderen, en daarmee de prototypes die als bewijs bij de ontwerpbesluiten horen.

## Besluit

`docs/design` blijft de enige vaste ignore in `eslint.config.js`. De andere ignores komen uit `.gitignore` (gegenereerde en ongevolgde mappen) en tellen niet mee. De rij `lint-config-ignores` staat daarom op 1 en mag alleen dalen; zij staat in `SHRINK_ONLY` van `scripts/debt-dashboard.sh`.

## Gevolgen

Een tweede handmatige ignore laat de rij stijgen en de build falen. Verdwijnt `docs/design` (bijvoorbeeld door archivering buiten de repository), dan gaat de rij naar 0 en uit `SHRINK_ONLY`.
