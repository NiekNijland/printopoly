# Guard: pure-layers

Contracts, enums, exceptions, value objects en `app/Support` noemen nooit een model of de databaselaag. Een DTO noemt een model alleen in zijn statische `from*`-fabrieken. `PureLayerGuard` leest de tabel: een naam zonder schuine streep is een map op elke diepte, een pad geldt vanaf de wortel.

| Rule id | De gids zegt | In plaats daarvan |
| --- | --- | --- |
| pure-layers | een pure laag noemt nooit een model of de databaselaag | geef door wat de klasse nodig heeft als scalar, array of value object |
| data-factories | een DTO noemt een model alleen in zijn statische `from*`-fabrieken | zet de vertaling van model naar DTO in een `from*`-fabriek |

| Laag | Model of database |
| --- | --- |
| `Contracts`, `Enums`, `Exceptions`, `ValueObjects`, `app/Support` | nooit |
| `Data` | alleen in statische `from*`-fabrieken |

De databaselaag is: de modellen in `app/Models`, `Illuminate\Database`, de facades `DB` en `Schema`, en alles onder `MongoDB`. Elke klasse houdt zich eraan; de guard heeft geen getelde lijst.

Review controleert, de guard niet: een import zonder gebruik, en of een klasse in de juiste pure laag staat (rubric item 9).
