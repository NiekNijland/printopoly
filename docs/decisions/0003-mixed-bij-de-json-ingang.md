# `mixed` alleen bij de JSON-ingang

Status: aanvaard. De uitzondering per map is vervangen door `0007-mixed-per-bestand.md`.

## Context

PHP-code die data van buiten leest, krijgt waarden zonder type: de JSON van de browser, een opgeslagen document, een rij uit de config. Op zo'n plek is `mixed` het eerlijke type van de parameter. Voorbij de ingang hoort de waarde een echt type te hebben. Bij de meting stond `mixed` als type in 72 regels van de applicatiecode; 56 daarvan in de ingangen hieronder.

## Besluit

`mixed` als type (parameter, returntype of property) staat alleen in de JSON-ingangen van de applicatie:

- `app/Support/JsonShape.php`, de helper die een waarde zonder type naar een vorm met type zet;
- `app/Modules/Editions/Support`, de validator van een editie en zijn parsers, die de JSON van de browser lezen;
- `app/Http/Requests`, de validators van een request.

Elders zet de code een waarde eerst om met `JsonShape` of met een parser hierboven. In een docblock (`array<string, mixed>`) en in de tests geldt deze regel niet.

De ratchetrij `mixed-outside-json-entry` telt `mixed` als type in de applicatiecode buiten die drie plekken. Ze telde bij de invoering 16 regels: kleine helpers die een waarde uit een document of de config nakijken (`PhotoTargets::clean`, `BoardProfile::float`, `MailConfig::filled` en verwanten). De rij mag alleen dalen; een nieuwe plek met `mixed` leest zijn waarde via `JsonShape` of verhuist naar een ingang.

Sinds stap 9 staat de rij op 0. Die helpers lezen hun waarde nu met `JsonShape::filledString`, `JsonShape::optionalString` of `JsonShape::floatOr`, of krijgen van hun aanroeper al een getypte waarde. De rij blijft staan als guard: hij mag niet meer boven 0 komen.

## Gevolgen

Een nieuwe ingang voor JSON, bijvoorbeeld een tweede validator buiten `app/Modules/Editions/Support`, vraagt een nieuw besluit dat de rij aanpast. Review controleert of een waarde bij de ingang zijn type krijgt; de rij ziet alleen het woord `mixed`.
