# De deuren en de grenzen van de linter dalen alleen

Status: voorgesteld in stap 9 (punten 2 en 5 van de lijst na nul in `docs/archive/zero-debt-plan.md`); de eigenaar keurt goed bij de merge.

## Context

`eslint-rules/doors.js` noemt in `doorFiles` de bestanden die een browser-API mogen aanraken: storage, `matchMedia`, `fetch`, de events van window en document, `Intl`, de console, en `location` voor een volledige paginalading. Elk bestand in die lijst is een uitzondering op `no-restricted-globals`, `no-restricted-properties` of `navigation/no-location-write`. Tot nu toe hield geen rij die lijst vast: een twaalfde deur kwam er zonder telling bij.

`eslint-rules/limits.js` zet de grenzen voor de omvang: een bestand hoogstens 400 regels (`MAX_FILE_LINES`), een functie en een test hoogstens 80 (`MAX_FUNCTION_LINES`). Een PR kon die getallen ophogen zonder dat een check het zag.

## Besluit

- De rij `lint-doors` telt de deuren in `doorFiles`: 11, de tien van de backlog plus `lib/full-page-navigation.ts`, dat eerder als vaste naam in de regel zelf stond.
- De rijen `lint-max-file-lines` en `lint-max-function-lines` lezen de twee getallen uit `eslint-rules/limits.js`: 400 en 80.
- Alle drie zijn `max`-rijen in `SHRINK_ONLY` van `scripts/debt-dashboard.sh`. Ze mogen dalen, nooit stijgen, en hebben geen doel van 0: een frontend zonder deur voor storage of `fetch` bestaat niet, en een grens van 0 regels evenmin.

## Gevolgen

Een nieuwe deur of een hogere grens laat de rij stijgen en de build falen. Wie er toch een wil, zet `[ratchet: <rij>] <reden>` in de commit en schrijft hier een nieuw record. Een deur die verdwijnt, haalt de rij omlaag.
