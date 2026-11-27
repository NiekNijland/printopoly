# Guard: code-clones

`CodeCloneGuard` zoekt code die in twee of meer bestanden letterlijk terugkomt. Hij leest de PHP-bestanden in `app` en de `.ts`- en `.tsx`-bestanden in `resources/js`, zonder tests en zonder `resources/js/testing`. Per bestand houdt hij de regels die tellen: zonder witruimte aan de randen, zonder regels met alleen haakjes of leestekens, zonder commentaar, imports, `use`, `namespace`, `declare(...)`, de PHP-openingstag, een `export { ... }` en een sluitende JSX-tag. Acht van zulke regels achter elkaar die in een ander bestand ook staan, zijn een kopie. Kopieën die elkaar raken of overlappen vormen één groep.

| Rule id | The guide must say | Instead |
| --- | --- | --- |
| `code-clones` | dezelfde acht of meer regels in twee bestanden | zet de regels in één functie of component die elk bestand importeert |

Telling: rij `code-clones` in `scripts/ci-ratchets.sh` telt de regels van de lijst code-clones.txt in de map lists van `tests/Guards`. Elke regel is een groep: de hash van het eerste venster en de bestanden. De lijst krimpt alleen; een nieuwe groep faalt, en een groep die weg is moet van de lijst. Waarom de overgebleven groepen blijven staan, staat in `docs/decisions/0012-dubbele-code.md`.

Review controleert, de guard niet: een kopie met andere namen, en een kopie binnen één bestand.
