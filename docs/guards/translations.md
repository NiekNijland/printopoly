# Guard: translations

Elke sleutel staat in elke taal, met dezelfde placeholders en meervoudsvormen; elke sleutel die de code letterlijk vertaalt, bestaat; geen sleutel is ongebruikt.

`TranslationKeysGuard` leest `lang/*.json` en de bronnen in `app`, `config`, `routes`, `resources/views` en `resources/js` (tests niet).

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| translation-languages | elke sleutel staat in elke taal met dezelfde `:placeholders` en evenveel vormen gescheiden door `\|` | vul de taal aan |
| translation-defined | een sleutel in `t()`, `tChoice()`, `__()`, `trans()`, `trans_choice()` of `@lang` bestaat | voeg hem toe aan elke taal, of noem een bestaande sleutel |
| translation-unused | een sleutel staat als hele string in een bron, of past bij het vaste begin of eind van een template | verwijder de sleutel uit elke taal |

De ongebruikte sleutels van vandaag staan in `baselines/translation-unused-keys.txt`, geteld door de ratchet-rij `keyed-baselines`.

Review controleert, de guard niet: of een tekst goed vertaald is.
