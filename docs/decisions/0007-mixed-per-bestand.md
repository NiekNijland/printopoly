# `mixed` per bestand bij de JSON-ingang

Status: aanvaard. Vervangt in `0003-mixed-bij-de-json-ingang.md` de uitzondering per map.

## Context

Besluit 0003 zonderde twee hele mappen uit van de rij `mixed-outside-json-entry`: `app/Modules/Editions/Support` en `app/Http/Requests`. Een nieuw bestand in die mappen mocht dus `mixed` gebruiken zonder dat een rij het zag, en binnen de mappen kon het aantal ongemerkt groeien. Bij de meting stonden er 48 typen `mixed` in 16 bestanden van `app/Modules/Editions/Support` en geen in `app/Http/Requests`.

## Besluit

- De rij `mixed-outside-json-entry` zondert alleen nog `app/Support/JsonShape.php` en de bestanden van `app/Modules/Editions/Support` uit die bij de meting `mixed` hadden, elk bij naam. `app/Http/Requests` telt gewoon mee.
- De nieuwe rij `json-entry-mixed` telt `mixed` als type in `app/Modules/Editions/Support`. Het is een `max`-rij die alleen daalt; ze staat in `SHRINK_ONLY` van `scripts/debt-dashboard.sh`.
- `StandardEdition` leest zijn lijsten van objecten nu met `JsonShape::maps` en `EditionValidator::choices` krijgt een `?string`. Daarmee ging de telling van 48 naar 41 in 15 bestanden.

De overige 41 staan in parsers en validators die de JSON van de browser lezen, waar `mixed` het eerlijke type is.

## Gevolgen

Een nieuw bestand met `mixed` buiten `JsonShape` laat `mixed-outside-json-entry` stijgen, ook in de map van de parsers. Meer `mixed` in een uitgezonderd bestand laat `json-entry-mixed` stijgen. Raakt een uitgezonderd bestand zijn laatste `mixed` kwijt, dan gaat zijn uitzondering uit de rij. Review controleert of een waarde bij de ingang zijn type krijgt; de rijen zien alleen het woord `mixed`.
