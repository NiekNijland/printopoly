# Guard: translations

Elke sleutel staat in elke taal, met dezelfde placeholders en meervoudsvormen; elke sleutel die de code letterlijk vertaalt, bestaat; geen sleutel is ongebruikt.

`TranslationKeysGuard` leest `lang/*.json` en de bronnen in `app`, `config`, `routes`, `resources/views` en `resources/js` (tests niet).

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| translation-languages | elke sleutel staat in elke taal met dezelfde `:placeholders` en evenveel vormen gescheiden door `\|` | vul de taal aan |
| translation-defined | een sleutel in `t()`, `tChoice()`, `__()`, `trans()`, `trans_choice()` of `@lang` bestaat | voeg hem toe aan elke taal, of noem een bestaande sleutel |
| translation-unused | een sleutel staat als hele string in een bron, of past bij het vaste begin of eind van een template | verwijder de sleutel uit elke taal |
| translation-validation | elke validatieregel die de code gebruikt, heeft een Nederlandse tekst in `lang/nl/validation.php` | voeg de tekst van de regel toe |

`ValidationMessageGuard` leest de methodes `rules()` in `app`: elke regel als tekst, met een parameter of na `|`, en elke regel van de fabriek `Rule::`. Een regel zonder eigen melding (`nullable`, `sometimes`, `bail` en de `exclude`-regels) telt niet. Het Engels komt uit Laravel zelf. `tests/Feature/ValidationMessagesTest.php` bewijst dat de vertaler de teksten vindt.

Een sleutel die alleen een sjabloon van Laravel gebruikt telt als gebruikt: de voettekst van de markdownmails vertaalt `All rights reserved.`.

Review controleert, de guard niet: of een tekst goed vertaald is.
